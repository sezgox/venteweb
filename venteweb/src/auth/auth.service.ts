import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { jwtConfig } from 'src/core/consts/jwt-config.const';
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
    return {userData, access_token}
  }

  logout() {
    return 'This action logs out a auth';
  }

  async createJwtToken(userData: any) {
    console.log(userData)
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
    console.log(payload)
        return await this.jwtService.signAsync(payload, jwtConfig);
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

    return { userData: user, access_token };
  }

}
