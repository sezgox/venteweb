import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { LoadingComponent } from '../../../components/shared/loading/loading.component';
import { PFP_URL } from '../../../core/consts/pfp.const';
import { UpdateUserResponseDto, UpdateUserSuccessResponse } from '../../../core/interfaces/api-response.interface';
import { EditUserDto, UserSummary } from '../../../core/interfaces/user.interfaces';
import { UsersService } from '../../../core/services/users.service';

@Component({
  selector: 'app-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  template: `
<dialog open class="fixed inset-0 z-50 bg-transparent m-0 p-0 w-full h-full max-w-none max-h-none">
  <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center md:justify-center">
    <div class="bg-bg w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-xl shadow-2xl flex flex-col border-0 md:border-2 md:border-gray200 overflow-hidden">

      <!-- Header -->
      <div class="flex items-center justify-between p-4 md:p-6 border-b border-gray200 flex-shrink-0">
        <div>
          <h3 class="text-xl md:text-2xl font-bold text-text">Edit Profile</h3>
          <p class="text-sm text-gray600 mt-1">Update your profile information</p>
        </div>
        <button
          class="text-gray600 hover:text-text transition-colors p-2 hover:bg-gray100 rounded-lg"
          (click)="closeModal()"
        >
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 md:p-6">
        <form class="space-y-6">

          <!-- Photo Preview -->
          <div class="flex flex-col items-center gap-4">
            <img
              [src]="photoPreviewUrl || (editUser.photo ?? pfp)"
              [alt]="editUser.name"
              class="w-32 h-32 rounded-full object-cover border-4 border-primary"
            >
            <div class="w-full">
              <label class="block text-sm font-semibold text-text mb-2">Profile Photo</label>
              <input
                type="file"
                accept="image/*"
                (change)="onPhotoChange($event)"
                class="w-full px-4 py-2 rounded-lg border-2 border-gray200 bg-bg text-text focus:outline-none focus:border-primary transition-colors"
              >
              <p class="text-xs text-gray500 mt-1">Upload a new profile picture</p>
            </div>
          </div>

          <!-- Username -->
          <div>
            <label class="block text-sm font-semibold text-text mb-2">Username</label>
            <input
              type="text"
              [(ngModel)]="editUser.username"
              name="username"
              placeholder="@username"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray200 bg-bg text-text focus:outline-none focus:border-primary transition-colors"
            >
          </div>

          <!-- Name -->
          <div>
            <label class="block text-sm font-semibold text-text mb-2">Full Name</label>
            <input
              type="text"
              [(ngModel)]="editUser.name"
              name="name"
              placeholder="John Doe"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray200 bg-bg text-text focus:outline-none focus:border-primary transition-colors"
            >
          </div>

          <!-- Email -->
          <div>
            <label class="block text-sm font-semibold text-text mb-2">Email</label>
            <input
              type="email"
              [(ngModel)]="editUser.email"
              name="email"
              placeholder="john@example.com"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray200 bg-bg text-text focus:outline-none focus:border-primary transition-colors"
            >
          </div>

          <!-- Bio -->
          <div>
            <label class="block text-sm font-semibold text-text mb-2">Bio</label>
            <textarea
              [(ngModel)]="editUser.bio"
              name="bio"
              placeholder="Tell us about yourself..."
              rows="4"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray200 bg-bg text-text focus:outline-none focus:border-primary transition-colors resize-none"
            ></textarea>
            <p class="text-xs text-gray500 mt-1">{{ editUser.bio!.length || 0 }}/500 characters</p>
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm font-semibold text-text mb-2">Password</label>
            <input
              type="password"
              [(ngModel)]="editUser.password"
              name="password"
              placeholder="Password"
              class="w-full px-4 py-3 rounded-lg border-2 border-gray200 bg-bg text-text focus:outline-none focus:border-primary transition-colors"
            >
          </div>

        </form>
      </div>

      <!-- Footer (always visible) -->
      <div class="flex gap-3 p-4 md:p-6 border-t border-gray200 bg-bg flex-shrink-0">
        <button class="btn-other flex-1" (click)="closeModal()">Cancel</button>
        <button class="btn-primary flex-1" (click)="saveChanges()">Save Changes</button>
      </div>

    </div>
  </div>

  <!-- Loading overlay -->
  @if(loading){
    <app-loading></app-loading>
  }
</dialog>

  `,
  styles: []
})
export class EditModalComponent {
  @Input() user!: UserSummary;
  @Output() closeEdit = new EventEmitter<void>();
  @Output() profileUpdated = new EventEmitter<UpdateUserResponseDto>();

  private readonly usersService = inject(UsersService);
  private readonly toastr = inject(ToastrService);

  editUser: EditUserDto = {
    id: '',
    username: '',
    name: '',
    email: '',
    photo: '',
    bio: '',
    locale: '',
  };

  photoPreviewUrl: string | null = null;
  photoFile: File | null = null;
  pfp = PFP_URL;

  loading: boolean = false;

  ngOnInit() {
    // Initialize editUser with current user data
    this.editUser = {
      id: this.user.id,
      username: this.user.username,
      name: this.user.name,
      email: this.user.email,
      photo: this.user.photo,
      bio: this.user.bio ?? '',
      locale: this.user.locale,
    };
  }

  onPhotoChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.photoFile = input.files[0];
      this.photoPreviewUrl = URL.createObjectURL(this.photoFile);
    }
  }

  closeModal() {
    if (this.photoPreviewUrl) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
    this.closeEdit.emit();
  }

  async saveChanges() {
    const formData = this.convertToFormData(this.editUser);
    this.loading = true; // mostrar overlay

    try {
      const response = await this.usersService.updateUser(this.user!.id!, formData);
      if(response.success){
        this.toastr.success('Profile updated successfully');

        this.profileUpdated.emit((response as UpdateUserSuccessResponse).results);
      } else {
        this.toastr.error(response.message);
      }
    } catch (err) {
      this.toastr.error('An unexpected error occurred.');
      console.error(err);
    } finally {
      this.loading = false; // ocultar overlay
      this.closeModal();
    }
  }


  ngOnDestroy() {
    if (this.photoPreviewUrl) {
      URL.revokeObjectURL(this.photoPreviewUrl);
    }
  }

  convertToFormData(user: EditUserDto): FormData {
    const formData = new FormData();
    formData.append('username', user.username);
    formData.append('name', user.name);
    formData.append('email', user.email);
    formData.append('bio', user.bio);
    if(this.photoFile){
      formData.append('photo', this.photoFile)
    }
    if (user.password) {
      formData.append('password', user.password);
    }
    return formData;
  }
}
