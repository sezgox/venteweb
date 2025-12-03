import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { jwtConfig, refreshTokenConfig } from 'src/core/consts/jwt-config.const';
import { UserRepository } from 'src/user/user.repository';
import { UserLoginDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {

  constructor(private userRepository: UserRepository, private jwtService: JwtService, private usersRepository: UserRepository) {}

  private googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  async login(userLoginDto: UserLoginDto) {
    const uniqueInput = userLoginDto.username ? {username: userLoginDto.username} : {email: userLoginDto.email};
    const userData = await this.userRepository.findByUniqueInput(uniqueInput);
    if(!userData) throw new BadRequestException('User not found');
    const passwordIsCorrect = await bcrypt.compare(userLoginDto.password, userData.password);
    if(!passwordIsCorrect) throw new UnauthorizedException('Incorrect password');
    const access_token = await this.createJwtToken(userData);
    const refresh_token = await this.createRefreshToken(userData.id);
    await this.saveLogin(userData.id, access_token, new Date());
    return {userData, access_token, refresh_token}
  }

  async saveLogin(userId: string, refreshToken: string, lastLogin: Date) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    return await this.userRepository.login(userId, hashedRefreshToken, lastLogin);
  }

  logout(userId: string) {
    this.userRepository.logout(userId).catch(err => {
        console.error('Failed to clear refresh token for user', userId, err);
    });
  }

  async createJwtToken(userData: any) {
    const payload = { 
      sub: userData.id, 
      permission: userData.permission,
      level: userData.level,
      email: userData.email,
      photo: userData.photo,
      username: userData.username, 
      name: userData.name, 
      locale: userData.locale ,
      bio: userData.bio,
    };
    return await this.jwtService.signAsync(payload, jwtConfig);
  }

  async createRefreshToken(userId: string){
    return this.jwtService.signAsync({sub: userId}, refreshTokenConfig);
  }

  async loginWithGoogle(tokenId: string) {
    // 1️⃣ Verificar token con Google
    const ticket = await this.googleClient.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, locale } = payload!;

    // 2️⃣ Buscar o crear usuario en la DB
    let user = await this.usersRepository.findByUniqueInput({email});
    if (!user) {
      user = await this.usersRepository.create({
        name,username: `user${googleId}`, email, password: null, locale
      });
    }

    // 3️⃣ Generar JWT de tu app
    const access_token = await this.createJwtToken(user);
    const refresh_token = await this.createRefreshToken(user.id);
    await this.saveLogin(user.id, access_token, new Date());

    return { userData: user, access_token, refresh_token };
  }

  async getMe(userId: string) {
    const user = await this.usersRepository.findOne(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

}
