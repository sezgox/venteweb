import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from 'src/core/guards/auth.guard';
import { CustomResponse, LoginResponse, UserResponse } from 'src/core/interfaces/response.interface';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/login-user.dto';
import { MobileLoginDto } from './dto/mobile-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() userLoginDto: UserLoginDto, @Res() res: Response<CustomResponse<LoginResponse>>) {
    try{
      const {userData, access_token, refresh_token} = await this.authService.login(userLoginDto);
      const userSummary = {username: userData.username, email: userData.email, id: userData.id, name: userData.name, permission: userData.permission, level: userData.level, locale: userData.locale, photo: userData.photo};
      console.log(refresh_token);
      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });

      res.status(201).json({
        results: {access_token, user: userSummary}, 
        message: 'User logged in', 
        success: true
      });
    }catch(err){
      res.status(err.status ?? 400).json({
        success: false, 
        message: err.message ?? 'User not logged in', 
        metadata: userLoginDto
      });
    }
  }

  //TODO: Add login with no refresh token logic for mobiles

  @Post('google/mobile')
  async googleMobileLogin(@Body() mobileLoginDto: MobileLoginDto, @Res() res: Response<CustomResponse<LoginResponse>>) {
    try {
      const { userData, access_token } = await this.authService.loginWithMobileFirebase(mobileLoginDto.tokenId);
      const userSummary = { username: userData.username, email: userData.email, id: userData.id, name: userData.name, permission: userData.permission, level: userData.level, locale: userData.locale, photo: userData.photo };

      return res.status(201).json({
        results: { access_token, user: userSummary },
        message: 'User logged in with Google from mobile',
        success: true,
      });
    } catch (err) {
      return res.status(err.status ?? 401).json({
        success: false,
        message: err.message ?? 'Mobile login failed',
        metadata: { provider: 'firebase' },
      });
    }
  }

  @Post('google')
  async googleLogin(@Body('tokenId') tokenId: string,@Res() res: Response<CustomResponse<LoginResponse>>,) {
    try {
      const { userData, access_token, refresh_token } = await this.authService.loginWithGoogle(tokenId);
      const userSummary = { username: userData.username, email: userData.email, id: userData.id, name: userData.name, permission: userData.permission, level: userData.level, locale: userData.locale, photo: userData.photo };

      res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });

      res.status(201).json({
        results: { access_token, user: userSummary },
        message: 'User logged in with Google',
        success: true,
      });
    } catch (err) {
      res.status(401).json({
        success: false,
        message: 'Google token invalid or login failed',
        metadata: { err: err.message },
      });
    }
  }

  @UseGuards(AuthGuard)
  @Post('logout')
  logout(@Req() req: Request) {
    return this.authService.logout(req['user'].sub);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req, @Res() res: Response<CustomResponse<UserResponse>>,){
    try {
      const user = await this.authService.getMe(req.user.sub);
      return res.json({results: user, message: 'User authenticated', success: true});
    } catch (error) {
      res.status(error.status ?? 500);
      return res.json({success: false, message: error.message ?? 'Server error'})
    }
  }

  @Post('refresh')
  async refresh(@Req() req, @Res() res: Response<CustomResponse<LoginResponse>>) {
    try {
      const refreshToken = req.cookies['refresh_token'];
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'No refresh token cookie found',
        });
      }
      const {user, access_token, rotatedRefreshToken} = await this.authService.refreshToken(refreshToken);
      res.cookie('refresh_token', rotatedRefreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });
      return res.json({results: {access_token, user}, message: 'User session refreshed', success: true});
    } catch (error) {
      console.error('Error en /auth/refresh:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

}
