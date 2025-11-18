import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EventCardComponent } from '../../../components/shared/event-card/event-card.component';
import { HeaderComponent } from '../../../components/shared/header/header.component';
import { LoadingComponent } from '../../../components/shared/loading/loading.component';
import { UpdateUserResponseDto, UserSuccessReponse } from '../../../core/interfaces/api-response.interface';
import { Event, Participation, Visibility } from '../../../core/interfaces/events.interfaces';
import { User, UserSummary } from '../../../core/interfaces/user.interfaces';
import { UsersService } from '../../../core/services/users.service';
import { EditModalComponent } from '../edit-modal/edit-modal.component';

type ProfileTab = 'events' | 'participations' | 'private';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, HeaderComponent, EventCardComponent, EditModalComponent, LoadingComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {

  private readonly usersService: UsersService = inject(UsersService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly toastr: ToastrService = inject(ToastrService);
  private readonly router: Router = inject(Router);

  loading: boolean = false;

  currentUser: UserSummary | null = this.usersService.getCurrentUser();
  user: User | null = null;
  ownProfile = false;
  isFollowing = false;
  isFriend = false;

  activeTab: ProfileTab = 'events';
  publicEvents: Event[] = [];
  publicParticipations: Participation[] = [];
  privateEvents: Event[] = [];
  privateParticipations: Participation[] = [];

  edit: boolean = false;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const username = params.get('username')!;
      this.getUser(username);
    });
  }

  async getUser(username: string): Promise<void> {
    this.loading = true;
    try{
      const res = await this.usersService.getProfile(username);
      if (res.success) {
        this.user = (res as UserSuccessReponse).results;
        this.ownProfile = this.currentUser?.id === this.user?.id;
        this.isFollowing = this.user?.followers.some(follow => follow.followerId=== this.currentUser?.id);
        this.isFriend = this.isFollowing && this.user?.following.some(follow => follow.followedId === this.currentUser?.id);
        this.populateCollections();
      } else {
        this.user = null;
      }
    }catch(error){
      this.toastr.error('An unexpected error occurred');
      console.error(error);
    }finally{
      this.loading = false;
    }
  }

  setActiveTab(tab: ProfileTab): void {
    if ((this.ownProfile || tab !== 'private' || this.isFriend)) {
      this.activeTab = tab;
    }
  }

  async toggleFollow(): Promise<void> {
    if(this.isFollowing){
      const res = await this.usersService.unfollowUser(this.user?.id!);
      if(res.success){
        this.user!.followers = this.user!.followers.filter(follower => follower.followerId !== this.currentUser?.id);
        this.isFollowing = !this.isFollowing;
      }else{
        this.toastr.error(res.message);
      }
    }else{
      const res = await this.usersService.followUser(this.user?.id!);
      if(res.success){
        this.user?.followers.push({followerId: this.currentUser?.id!, followedId: this.user?.id!, follower: this.currentUser!, followed: this.user!});
        this.isFollowing = !this.isFollowing;
      }else{
        this.toastr.error(res.message);
      }
    }

  }

  private populateCollections(): void {
    if (!this.user) {
      this.publicEvents = [];
      this.publicParticipations = [];
      this.privateEvents = [];
      this.privateParticipations = [];
      return;
    }

    this.publicEvents = this.user.events.filter(event => event.visibility === Visibility.Public);
    this.privateEvents = this.user.events.filter(event => event.visibility === Visibility.Private);

    this.publicParticipations = this.user.participations.filter(
      participation => participation.event.visibility === Visibility.Public
    );
    this.privateParticipations = this.user.participations.filter(
      participation => participation.event.visibility === Visibility.Private
    );
  }

  onProfileUpdated(updatedUser: UpdateUserResponseDto) {
    localStorage.setItem('access_token', updatedUser.access_token);
    const usernameChanged = this.user?.username !== updatedUser.username;
    const emailChanged = this.user?.email !== updatedUser.email;

    if (usernameChanged || emailChanged) {
      // Actualizamos el estado del usuario
      this.user!.username = updatedUser.username;
      this.user!.email = updatedUser.email;
      this.usersService.setCurrentUser(this.user!);
    }

    // Si el username cambió, navegamos a la nueva ruta
    if (usernameChanged) {
      this.router.navigate(['/user', updatedUser.username]);
    }

    this.usersService.setCurrentUser(updatedUser);
    this.getUser(this.user!.username);
  }

}
