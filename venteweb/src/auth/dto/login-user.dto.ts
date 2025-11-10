import { IsOptional, IsString } from "class-validator";
import { UsernameOrEmailClass } from "./login-validator";


@UsernameOrEmailClass()
export class UserLoginDto {
    @IsOptional()
    @IsString()
    username: string;

    @IsOptional()
    @IsString()
    email: string;

    @IsString()
    password: string;
}
