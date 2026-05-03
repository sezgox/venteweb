import { AfterViewInit, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../enviroments/enviroment';
import { LoginSuccessResponse } from '../../core/interfaces/api-response.interface';
import { RegisterDto } from '../../core/interfaces/register.dto.interface';
import { UserSummary } from '../../core/interfaces/user.interfaces';
import { AuthService } from '../../core/services/auth.service';
import { UsersService } from '../../core/services/users.service';

declare const google: any;

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.css'] // corregido
})
export class AuthComponent implements AfterViewInit{

  private readonly authService = inject(AuthService);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);
  private readonly usersService = inject(UsersService);
  isLogin = true;
  activationPendingEmail = '';
  activationPendingPassword = '';
  activationRequired = false;


  loginPassword: string = '';
  loginCredential: string = '';

  // Formulario de Login

  // Formulario de Registro
  registerData: RegisterDto = {
    name: '',
    email: '',
    username: '',
    password: '',
    locale: navigator.language
  };

  ngAfterViewInit(): void {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      document.body.appendChild(script);
  }

  onGoogleSignIn(){
    google.accounts.id.initialize({
      client_id: environment.googleOAuthClientId,
      callback: (response: any) => {
        console.log('ID Token de Google:', response.credential);

        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const userPayload = JSON.parse(atob(base64));
        console.log('Datos del usuario:', userPayload);
        this.handleGoogleLogin(response);
        //this.handleGoogleLogin(response)
      }
    });
    google.accounts.id.prompt(); // Solicita login explícitamente

  }


  async handleGoogleLogin(response: any) {
    const tokenId = response.credential;
    const res = await this.authService.loginWithGoogle(tokenId);
    if (res.success) {
      console.log(res)
      localStorage.setItem('access_token', (res as LoginSuccessResponse).results.access_token);
      console.log(localStorage.getItem('access_token'))
      this.onSuccessFeedback((res as LoginSuccessResponse).results.user);
    } else {
      this.toastr.error(res.message);
    }
  }


  toggleMode() {
    this.isLogin = !this.isLogin;
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async onLogin() {
    const loginData = this.isEmail(this.loginCredential) /*verificar si es email o username*/ ?
    {email: this.loginCredential, password: this.loginPassword} :
    {username: this.loginCredential, password: this.loginPassword};
    const response = await this.authService.login(loginData);
    if(response.success){
      localStorage.setItem('access_token', (response as LoginSuccessResponse).results.access_token);
      this.onSuccessFeedback((response as LoginSuccessResponse).results.user);
    }else{
      this.activationRequired = Boolean(response.metadata?.activationRequired);
      if (this.activationRequired) {
        this.activationPendingEmail = this.loginCredential;
        this.activationPendingPassword = this.loginPassword;
        this.toastr.warning(response.message, 'Activate your account');
        return;
      }
      this.onErrorFeedback();
      this.toastr.error(response.message || 'Login failed');
    }
  }

  async onRegister() {
    const response = await this.authService.register(this.registerData);
    if(response.success){
      this.loginCredential = this.registerData.email;
      this.loginPassword = this.registerData.password;
      this.activationPendingEmail = this.registerData.email;
      this.activationPendingPassword = this.registerData.password;
      this.isLogin = true;
      try {
        await this.authService.sendActivationEmail(
          this.registerData.email,
          this.registerData.password,
        );
        this.toastr.success('Check your email to activate your account.');
      } catch (error) {
        this.toastr.warning(
          error instanceof Error ? error.message : 'Account created, but activation email could not be sent.',
        );
      }
    }else{
      this.onErrorFeedback();
      this.toastr.error(response.message || 'Registration failed');
    }
  }

  async resendActivationEmail() {
    const email = this.activationPendingEmail || this.loginCredential;
    const password = this.activationPendingPassword || this.loginPassword;
    if (!email || !password) {
      this.toastr.warning('Enter your email and password first.');
      return;
    }

    try {
      await this.authService.sendActivationEmail(email, password);
      this.toastr.success('Activation email sent.');
    } catch (error) {
      this.toastr.error(
        error instanceof Error ? error.message : 'Could not resend activation email.',
      );
    }
  }

  onErrorFeedback(){
    const inputs = document.querySelectorAll('#auth-modal input');
    inputs.forEach(input => {
      input.classList.add('shake')
      setTimeout(() => {
        input.classList.remove('shake')
      }, 1000);
    });
  }

  onSuccessFeedback(user: UserSummary){
    this.toastr.clear()
    this.toastr.success(`Welcome ${user.name}!`);
    const authModal = document.getElementById('auth-modal');
    authModal?.hidePopover();
    this.router.navigate(['events'], {
      state: { addEvent: true }
    });
    this.usersService.setCurrentUser(user);
  }

  onCancel() {
    const popover = document.getElementById('auth-modal');
    popover?.hidePopover();
  }
}
