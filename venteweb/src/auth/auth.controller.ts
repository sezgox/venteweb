import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CustomResponse, LoginResponse } from 'src/core/interfaces/response.interface';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/login-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() userLoginDto: UserLoginDto, @Res() res: Response<CustomResponse<LoginResponse>>) {
    try{
      const {userData,access_token} = await this.authService.login(userLoginDto);
      const userSummary = {username: userData.username, email: userData.email, id: userData.id, name: userData.name, permission: userData.permission, level: userData.level, locale: userData.locale, photo: userData.photo};
      res.status(201);
      return res.json({results: {access_token, user: userSummary}, message: 'User logged in', success: true});
    }catch(err){
      res.status(err.status ?? 400);
      return res.json({success: false, message: err.message ?? 'User not logged in', metadata: userLoginDto});
    }
  }
  
  @Post('logout')
  logout() {
    return this.authService.logout();
  }

  @Post('google')
  async googleLogin(@Body('tokenId') tokenId: string,@Res() res: Response<CustomResponse<LoginResponse>>,) {
    try {
      const { userData, access_token } = await this.authService.loginWithGoogle(tokenId);
      const userSummary = { username: userData.username, email: userData.email, id: userData.id, name: userData.name, permission: userData.permission, level: userData.level, locale: userData.locale, photo: userData.photo };

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
}
