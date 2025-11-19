import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { HeaderComponent } from '../../../components/shared/header/header.component';
import { LoadingComponent } from '../../../components/shared/loading/loading.component';
import { PFP_URL } from '../../../core/consts/pfp.const';
import { GetEventSuccessResponse, InvitationSuccessResponse, ParticipationErrorResponse, ParticipationSuccessResponse, RequestCollaborationErrorResponse, SearchUsersSuccessResponse } from '../../../core/interfaces/api-response.interface';
import { Invitation, ParticipationType, Request } from '../../../core/interfaces/events.interfaces';
import { UserSummary } from '../../../core/interfaces/user.interfaces';
import { EventsService } from '../../../core/services/events.service';
import { UsersService } from '../../../core/services/users.service';
import { Event } from './../../../core/interfaces/events.interfaces';

@Component({
  selector: 'app-event',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, HeaderComponent, FormsModule, LoadingComponent],
  templateUrl: './event.component.html',
  styleUrl: './event.component.css'
})
export class EventComponent implements OnInit {
  private usersService = inject(UsersService);
  private eventsService = inject(EventsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private readonly sanitizer: DomSanitizer = inject(DomSanitizer);
  toastr = inject(ToastrService);

  event?: Event;
  constructor() {
    const nav = this.router.getCurrentNavigation();
    this.event = nav?.extras?.state?.['event'];
    console.log(this.event)
  }

  loading: boolean = false;
  pfp = PFP_URL;

  currentUserId: string | null = null;
  showDeleteDialog = false;
  showRequestsDialog = false;
  showInviteDialog = false;
  expandedRequestId: string | null = null;
  sendRequestDialog: boolean = false;
  sendInvitationDialog: boolean = false;
  requestMessage: string = 'I want to collaborate in your event!'
  invitationMessage: string = 'Hey, join my event!'
  invitedUser: UserSummary | null = null;
  userSearch = "";
  searchResults: UserSummary[] = [];
  invitationType: ParticipationType = ParticipationType.Collaboration;
  participationTypes = ParticipationType;

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const eventId = params.get('id')!;
      this.getEvent(eventId);
    });
    const navigation = this.router.getCurrentNavigation();
    const stateEvent = navigation?.extras?.state?.['event'] as Event | undefined;
    const invitation = this.route.snapshot.queryParamMap.get('invitation');


    if (stateEvent) {
      this.event = stateEvent;
    }else{
      const id = this.route.snapshot.paramMap.get('id');
      this.getEvent(id!, invitation!);
    }
    const currentUser = this.usersService.getCurrentUser();
    this.currentUserId = currentUser?.id || null;
  }

  async getEvent(id: string, invitation?: string){
    this.loading = true;
    try{
      const response = await this.eventsService.getEvent(id, invitation);
      if(response.success){
        this.event = (response as GetEventSuccessResponse).results;
        console.log(this.event)
      }
    }catch(error){
      this.toastr.error('An unexpected error occurred');
      console.error(error);
    }finally{
      this.loading = false;
    }
  }

  async deleteEvent(){
    const response = await this.eventsService.deleteEvent(this.event?.id!);
    if(response.success){
      this.toastr.success('Event deleted successfully');
      this.router.navigate(['/events/dashboard']);
    }else{
      this.toastr.error(response.message,'Delete failed');
    }
  }

  get eventStarted(): boolean {
    return new Date(this.event?.startDate!) < new Date();
  }

  get eventFinished(): boolean {
    return new Date(this.event?.endDate!) < new Date();
  }

  get isOwnEvent(): boolean {
    return this.currentUserId === this.event?.organizerId;
  }

  get attendeesCount(): number {
    return this.event?.participations?.filter(p => p.type === ParticipationType.Attendance).length || 0;
  }

  get collaboratorsCount(): number {
    return this.event?.participations?.filter(p => p.type === ParticipationType.Collaboration).length || 0;
  }

  get isParticipating(): boolean {
    return this.event?.participations?.some(p => p.userId === this.currentUserId) || false;
  }

  get eventAlreadyStarted(): boolean {
    return new Date(this.event?.startDate!) < new Date();
  }

  getSafeDescription(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.event?.description!);
  }

  onCollaborate(): void {
    if(!this.currentUserId){
      this.toastr.warning('You must be logged in to request collaboration');
      document.getElementById('auth-modal')?.showPopover();
      return;
    }
    if(this.event?.requiresRequest){
      this.sendRequestDialog = true;
      return;
    }
    this.sendParticipation(ParticipationType.Collaboration);
    console.log('ENVIAR PARTICIPACIÓN TIPO COLLABORATION DE UNA!!')
  }

  async sendRequest(){
    const request = {
      userId: this.currentUserId!,
      eventId: this.event?.id!,
      text: this.requestMessage ?? 'I want to collaborate in your event!'
    }
    const response = await this.eventsService.requestCollaboration(request);
    this.sendRequestDialog = false;
    if(response.success){
      this.toastr.success('Request sent successfully');
    }else{
      this.toastr.error((response as RequestCollaborationErrorResponse).message,'Request failed');
    }
  }

  async sendParticipation(type: ParticipationType, request?: Request): Promise<boolean>{
    const participation = {
      userId: request?.userId ?? this.currentUserId!,
      eventId: this.event?.id!,
      type: type,
      requestId: request?.id
    }
    const response = await this.eventsService.participate(participation);
    if(response.success){
      type == ParticipationType.Collaboration ? this.toastr.success('Collaboration confirmed!') : this.toastr.success('Attendance confirmed!');
      this.event?.participations.push((response as ParticipationSuccessResponse).results);
      return true;
    }else{
      this.toastr.error((response as ParticipationErrorResponse).message,'Participation failed');
      return false;
    }
  }

  onAttend(): void {
    this.sendParticipation(ParticipationType.Attendance);
  }

  openDeleteDialog(): void {
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
  }

  openRequestsDialog(): void {
    this.showRequestsDialog = true;
    this.expandedRequestId = null;
  }

  closeRequestsDialog(): void {
    this.showRequestsDialog = false;
    this.expandedRequestId = null;
  }

  openInviteDialog(event: any): void {
    event.stopPropagation(); // evita abrir/cerrar el <details>
    this.showInviteDialog = true;
    this.searchUsers();
  }

  openSendInvitationDialog(user: any): void {
    this.sendInvitationDialog = true;
    this.invitedUser = user;
  }

  closeInviteDialog() {
    this.showInviteDialog = false;
  }

  async searchUsers() {
    const response = await this.usersService.searchUsers(this.userSearch);
    if (response.success) {
      const results = (response as SearchUsersSuccessResponse).results;
      this.searchResults = results.filter(user => !this.event!.participations.some(p => p.userId !== user.id) && user.id !== this.currentUserId && !this.event!.invitations.some(i => i.userId === user.id));
    }else{
      this.searchResults = [];
    }
  }

  async inviteUser() {
    const invitationDto = {
      eventId: this.event!.id,
      text: 'Hey, join my event!',
      type: this.invitationType
    }
    console.log("Inviting:", this.invitedUser?.username);
    this.sendInvitationDialog = false;
    const response = await this.usersService.inviteUserToEvent(this.invitedUser?.id!, invitationDto);
    console.log(response);
    if(response.success){
      this.toastr.success(`${this.invitedUser!.name} has to accept to join now`,'Invitation sent');
      const invitation = (response as InvitationSuccessResponse).results;
      invitation.user = this.invitedUser!;
      this.event!.invitations.push(invitation);
      this.searchUsers();
    }else{
      this.toastr.error(response.message,'Invitation failed');
    }

  }

  async acceptRequest(request: Request): Promise<void> {

    const response = await this.sendParticipation(ParticipationType.Collaboration, request);
    if(response){
      this.event!.requests = this.event!.requests.filter(r => r.id !== request.id);
    }
    if (this.event!.requests.length === 0) {
      this.closeRequestsDialog();
    }
  }

  async rejectRequest(requestId: string): Promise<void> {
    const response = await this.eventsService.removeRequest(requestId, this.event?.id!);
    if(response.success){
      this.toastr.success('Request rejected successfully');
      this.event!.requests = this.event!.requests.filter(r => r.id !== requestId);
    }else{
      this.toastr.error((response as ParticipationErrorResponse).message,'Request failed');
    }
    if (this.event?.requests && this.event.requests.length === 0) {
      // Close dialog if no more requests
      this.closeRequestsDialog();
    }
  }

  async removeParticipation(){
    const participation = this.event?.participations.find(p => p.userId === this.currentUserId);
    if(participation){
      const response = await this.eventsService.removeParticipation(participation.id, this.event?.id!);
      if(response.success){
        this.toastr.success('Participation removed successfully');
        this.event!.participations = this.event!.participations.filter(p => p.id !== participation.id);
      }else{
        this.toastr.error((response as ParticipationErrorResponse).message,'Participation failed');
      }
    }
  }

  async cancelInvitation(invitation: Invitation){
    const response = await this.usersService.rejectOrCancelInvitation(invitation.userId, invitation.id);
    if(response.success){
      this.toastr.success('Invitation canceled');
      this.event!.invitations = this.event!.invitations.filter(i => i.id !== invitation.id);
    }else{
      this.toastr.error((response as ParticipationErrorResponse).message,'Invitation failed');
    }
  }

}
