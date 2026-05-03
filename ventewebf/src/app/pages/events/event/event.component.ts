import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { combineLatest } from 'rxjs';
import { ButtonLoaderComponent } from '../../../components/shared/button-loader/button-loader.component';
import { LoadingComponent } from '../../../components/shared/loading/loading.component';
import { EVENT_POSTER_DEFAULT_URL } from '../../../core/consts/event-poster.const';
import { PFP_URL } from '../../../core/consts/pfp.const';
import { GetEventSuccessResponse, InvitationSuccessResponse, InvitationTokenSuccessResponse, ParticipationErrorResponse, ParticipationSuccessResponse, RequestCollaborationErrorResponse, SearchUsersSuccessResponse } from '../../../core/interfaces/api-response.interface';
import { ExternalInvitationActionDto, Invitation, ParticipationType, PrepareInvitationDto, Request, Visibility } from '../../../core/interfaces/events.interfaces';
import { UserSummary } from '../../../core/interfaces/user.interfaces';
import { EventsService } from '../../../core/services/events.service';
import { LoadingService } from '../../../core/services/loading.service';
import { UsersService } from '../../../core/services/users.service';
import { Event } from './../../../core/interfaces/events.interfaces';
import { jwtDecode } from 'jwt-decode'

@Component({
  selector: 'app-event',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, FormsModule, LoadingComponent, ButtonLoaderComponent],
  templateUrl: './event.component.html',
  styleUrl: './event.component.css'
})
export class EventComponent implements OnInit {
  private usersService = inject(UsersService);
  private eventsService = inject(EventsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private readonly sanitizer: DomSanitizer = inject(DomSanitizer);
  private readonly loadingService = inject(LoadingService);
  toastr = inject(ToastrService);

  event?: Event;
  constructor() {
    const nav = this.router.getCurrentNavigation();
    this.event = nav?.extras?.state?.['event'];
  }


  loading = this.loadingService.loading;
  attendLoading: boolean = false;
  collaborateLoading: boolean = false;
  deleteLoading: boolean = false;
  shareLoading: boolean = false;
  removeParticipationLoading: boolean = false;
  inviteLoading: boolean = false;
  requestLoading: boolean = false;
  processingRequests = new Set<string>();
  pfp = PFP_URL;
  readonly defaultEventPoster = EVENT_POSTER_DEFAULT_URL;

  currentUserId: string | null = null;
  showDeleteDialog = false;
  showRequestsDialog = false;
  showInviteDialog = false;
  expandedRequestId: string | null = null;
  sendRequestDialog: boolean = false;
  sendInvitationDialog: boolean = false;
  sendExternalInvitationDialog: boolean = false;
  previewInvitationDialog: boolean = false;
  requestMessage: string = 'I want to collaborate in your event!'
  invitationMessage: string = 'Hey, join my event!'
  invitedUser: UserSummary | null = null;
  userSearch = "";
  searchResults: UserSummary[] = [];
  invitationType: ParticipationType = ParticipationType.Attendance;
  participationTypes = ParticipationType;
  externalFirstName = '';
  externalLastName = '';
  externalEmail = '';
  externalPhone = '';
  preparedInvitation: Invitation | null = null;
  guest: boolean = false;
  externalUserId: string | null = null;
  invitationToken: string | null = null;
  externalInvitationActionLoading = false;
  externalInvitationActionStatus: 'idle' | 'success' | 'error' = 'idle';
  externalInvitationActionMessage: string | null = null;

  ngOnInit(): void {
    const currentUser = this.usersService.getCurrentUser();
    this.currentUserId = currentUser?.id || null;

    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, queryParams]) => {
      const eventId = params.get('id');
      if (!eventId) {
        return;
      }

      const invitation = queryParams.get('invitation');
      const guest = queryParams.get('guest');
      this.invitationToken = invitation;
      this.externalInvitationActionLoading = false;
      this.externalInvitationActionStatus = 'idle';
      this.externalInvitationActionMessage = null;
      this.externalUserId = null;
      this.guest = guest === 'true' && Boolean(invitation);

      if (this.guest && invitation) {
        const decodedInvitation = jwtDecode(invitation) as {
          eventId: string;
          organizer: string;
          invitedUser: string;
          externalUserId: string;
        };
        this.externalUserId = decodedInvitation.externalUserId;
      }

      void this.getEvent(eventId, invitation ?? undefined);
    });
  }

  async getEvent(id: string, invitation?: string) {
    try {
      const response = await this.eventsService.getEvent(id, invitation);
      if (response.success) {
        this.event = (response as GetEventSuccessResponse).results;
      }
    } catch (error) {
      this.toastr.error('An unexpected error occurred');
      console.error(error);
    }
  }

  async deleteEvent() {
    this.deleteLoading = true;
    try {
      const response = await this.eventsService.deleteEvent(this.event?.id!);
      if (response.success) {
        this.toastr.success('Event deleted successfully');
        this.router.navigate(['/events/dashboard']);
      } else {
        this.toastr.error(response.message, 'Delete failed');
      }
    } finally {
      this.deleteLoading = false;
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
    return this.event?.participations?.filter(p => p.type === ParticipationType.Volunteer).length || 0;
  }

  getPosterUrl(poster?: string | null): string {
    return poster?.trim() ? poster : this.defaultEventPoster;
  }

  onPosterError(event: globalThis.Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target || target.src === this.defaultEventPoster) return;
    target.src = this.defaultEventPoster;
  }

  get isParticipating(): boolean {
    if (this.guest && this.externalUserId) {
      return this.event?.participations?.some(p => p.externalUserId === this.externalUserId) || false;
    }

    if (!this.currentUserId) {
      return false;
    }

    return this.event?.participations?.some(p => p.userId === this.currentUserId) || false;
  }

  get eventAlreadyStarted(): boolean {
    return new Date(this.event?.startDate!) < new Date();
  }

  getSafeDescription(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.event?.description!);
  }

  onCollaborate(): void {
    if (!this.currentUserId) {
      this.toastr.warning('You must be logged in to request volunteering');
      document.getElementById('auth-modal')?.showPopover();
      return;
    }
    if (this.event?.requiresRequest) {
      this.sendRequestDialog = true;
      return;
    }
    this.collaborateLoading = true;
    this.sendParticipation(ParticipationType.Volunteer).finally(() => this.collaborateLoading = false);
  }

  async sendRequest() {
    this.requestLoading = true;
    try {
      const request = {
        userId: this.currentUserId!,
        eventId: this.event?.id!,
        text: this.requestMessage ?? 'I want to collaborate in your event!'
      }
      const response = await this.eventsService.requestCollaboration(request);
      this.sendRequestDialog = false;
      if (response.success) {
        this.toastr.success('Request sent successfully');
      } else {
        this.toastr.error((response as RequestCollaborationErrorResponse).message, 'Request failed');
      }
    } finally {
      this.requestLoading = false;
    }
  }

  async sendParticipation(type: ParticipationType, request?: Request): Promise<boolean> {
    const participation = {
      userId: request?.userId ?? this.currentUserId!,
      eventId: this.event?.id!,
      type: type,
      requestId: request?.id
    }
    const response = await this.eventsService.participate(participation);
    if (response.success) {
      type == ParticipationType.Volunteer ? this.toastr.success('Volunteer participation confirmed!') : this.toastr.success('Attendance confirmed!');
      this.event?.participations.push((response as ParticipationSuccessResponse).results);
      return true;
    } else {
      this.toastr.error((response as ParticipationErrorResponse).message, 'Participation failed');
      return false;
    }
  }

  onAttend(): void {
    this.attendLoading = true;
    this.sendParticipation(ParticipationType.Attendance).finally(() => this.attendLoading = false);
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
    this.sendExternalInvitationDialog = false;
    this.sendInvitationDialog = true;
    this.previewInvitationDialog = false;
    this.invitedUser = user;
  }

  openExternalInvitationDialog(): void {
    this.sendInvitationDialog = false;
    this.invitedUser = null;
    this.previewInvitationDialog = false;
    this.invitationType = ParticipationType.Attendance;
    this.sendExternalInvitationDialog = true;
  }

  closeInviteDialog() {
    this.showInviteDialog = false;
    this.sendInvitationDialog = false;
    this.sendExternalInvitationDialog = false;
    this.previewInvitationDialog = false;
    this.invitedUser = null;
    this.preparedInvitation = null;
  }

  async searchUsers() {
    const response = await this.usersService.searchFriends(this.userSearch);
    if (response.success) {
      const results = (response as SearchUsersSuccessResponse).results;
      this.searchResults = results.filter(user =>
        !this.event!.participations.some(p => p.userId === user.id) &&
        user.id !== this.currentUserId &&
        !this.event!.invitations.some(i => i.userId === user.id)
      );
    } else {
      this.searchResults = [];
    }
  }

  async inviteUser() {
    await this.generateFriendInvitation();
  }

  async generateFriendInvitation() {
    if (!this.invitedUser) {
      return;
    }

    this.inviteLoading = true;
    try {
      const invitationText = this.invitationMessage?.trim() || 'Hey, join my event!';
      const invitationDto: PrepareInvitationDto = {
        eventId: this.event!.id,
        text: invitationText,
        type: this.invitationType,
        userId: this.invitedUser.id,
      };
      const response = await this.eventsService.prepareInvitation(this.event!.id, invitationDto);
      if (response.success) {
        const invitation = (response as InvitationSuccessResponse).results;
        invitation.user = this.invitedUser!;
        this.upsertInvitation(invitation);
        this.preparedInvitation = invitation;
        this.sendInvitationDialog = false;
        this.previewInvitationDialog = true;
        this.searchUsers();
      } else {
        this.toastr.error(response.message, 'Invitation generation failed');
      }
    } finally {
      this.inviteLoading = false;
    }
  }

  private buildExternalInvitationPayload(): PrepareInvitationDto | null {
    const firstName = this.externalFirstName.trim();
    const lastName = this.externalLastName.trim();
    const email = this.externalEmail.trim();
    const phone = this.externalPhone.trim();
    const text = (this.invitationMessage?.trim() || 'Hey, join my event!').slice(0, 150);

    if (!firstName || !lastName) {
      this.toastr.error('First name and last name are required', 'Validation error');
      return null;
    }

    if (!email && !phone) {
      this.toastr.error('Provide at least one contact method: email or phone', 'Validation error');
      return null;
    }

    return {
      eventId: this.event!.id,
      text,
      type: ParticipationType.Attendance,
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined
    };
  }

  async inviteExternalUser(): Promise<void> {
    await this.generateExternalInvitation();
  }

  async generateExternalInvitation(): Promise<void> {
    const payload = this.buildExternalInvitationPayload();
    if (!payload) {
      return;
    }

    this.inviteLoading = true;
    try {
      const response = await this.eventsService.prepareInvitation(this.event!.id, payload);
      if (response.success) {
        const invitation = (response as InvitationSuccessResponse).results;
        this.upsertInvitation(invitation);
        this.preparedInvitation = invitation;
        this.sendExternalInvitationDialog = false;
        this.previewInvitationDialog = true;
        this.externalFirstName = '';
        this.externalLastName = '';
        this.externalEmail = '';
        this.externalPhone = '';
      } else {
        this.toastr.error(response.message, 'Invitation generation failed');
      }
    } finally {
      this.inviteLoading = false;
    }
  }

  async sharePreparedInvitation(): Promise<void> {
    if (!this.preparedInvitation) {
      return;
    }

    await this.copyInvitationUrl(this.preparedInvitation);
  }

  async shareEvent(): Promise<void> {
    if (!this.event || this.shareLoading) {
      return;
    }

    this.shareLoading = true;
    try {
      const url = await this.resolveEventShareUrl();
      if (!url) {
        return;
      }

      const shareData = {
        title: this.event.name,
        text: this.buildShareText(),
        url,
      };

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share(shareData);
          this.toastr.success('Event shared');
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
        }
      }

      await navigator.clipboard.writeText(url);
      this.toastr.success('Event URL copied to clipboard');
    } catch (error) {
      this.toastr.error('Could not share event');
      console.error(error);
    } finally {
      this.shareLoading = false;
    }
  }

  async shareInvitation(invitation: Invitation): Promise<void> {
    await this.copyInvitationUrl(invitation);
  }

  private async resolveEventShareUrl(): Promise<string | null> {
    if (!this.event) {
      return null;
    }

    if (this.event.visibility === Visibility.Public) {
      return this.buildEventUrl();
    }

    if (this.invitationToken?.trim()) {
      return this.buildEventUrl(this.invitationToken.trim(), this.guest);
    }

    const response = await this.eventsService.getInvitationToken(this.event.id);
    if (!response.success) {
      this.toastr.error(response.message ?? 'Could not generate invitation token', 'Share failed');
      return null;
    }

    const token = (response as InvitationTokenSuccessResponse).results.invitation;
    return this.buildEventUrl(token);
  }

  private buildShareText(): string {
    if (!this.event) {
      return 'Check out this event on Vente';
    }

    return `${this.event.name} · ${this.event.locationAlias}`;
  }

  private async copyInvitationUrl(invitation: Invitation): Promise<void> {
    const url = this.buildInvitationUrl(invitation);
    try {
      await navigator.clipboard.writeText(url);
      this.toastr.success('Invitation URL copied to clipboard');
    } catch {
      this.toastr.error('Could not copy invitation URL');
    }
  }

  isRequestProcessing(requestId: string): boolean {
    return this.processingRequests.has(requestId);
  }

  async acceptRequest(request: Request): Promise<void> {
    this.processingRequests.add(request.id);
    try {
      const response = await this.sendParticipation(ParticipationType.Volunteer, request);
      if (response) {
        this.event!.requests = this.event!.requests.filter(r => r.id !== request.id);
      }
      if (this.event!.requests.length === 0) {
        this.closeRequestsDialog();
      }
    } finally {
      this.processingRequests.delete(request.id);
    }
  }

  async rejectRequest(requestId: string): Promise<void> {
    this.processingRequests.add(requestId);
    try {
      const response = await this.eventsService.removeRequest(requestId, this.event?.id!);
      if (response.success) {
        this.toastr.success('Request rejected successfully');
        this.event!.requests = this.event!.requests.filter(r => r.id !== requestId);
      } else {
        this.toastr.error((response as ParticipationErrorResponse).message, 'Request failed');
      }
      if (this.event?.requests && this.event.requests.length === 0) {
        // Close dialog if no more requests
        this.closeRequestsDialog();
      }
    } finally {
      this.processingRequests.delete(requestId);
    }
  }

  async removeParticipation() {
    const participation = this.event?.participations.find(p => p.userId === this.currentUserId);
    if (participation) {
      this.removeParticipationLoading = true;
      try {
        const response = await this.eventsService.removeParticipation(participation.id, this.event?.id!);
        if (response.success) {
          this.toastr.success('Participation removed successfully');
          this.event!.participations = this.event!.participations.filter(p => p.id !== participation.id);
        } else {
          this.toastr.error((response as ParticipationErrorResponse).message, 'Participation failed');
        }
      } finally {
        this.removeParticipationLoading = false;
      }
    }
  }

  async cancelInvitation(invitation: Invitation) {
    if (!invitation.userId) {
      this.toastr.info('This invitation is linked to an external contact', 'Cannot cancel from this action');
      return;
    }
    const response = await this.usersService.rejectOrCancelInvitation(invitation.userId, invitation.id);
    if (response.success) {
      this.toastr.success('Invitation canceled');
      this.event!.invitations = this.event!.invitations.filter(i => i.id !== invitation.id);
    } else {
      this.toastr.error((response as ParticipationErrorResponse).message, 'Invitation failed');
    }
  }

  getInvitationRecipientName(invitation: Invitation): string {
    if (invitation.user?.name) {
      return invitation.user.name;
    }
    if (invitation.externalUser) {
      return `${invitation.externalUser.firstName} ${invitation.externalUser.lastName}`.trim();
    }
    return 'External guest';
  }

  get preparedInvitationUrl(): string {
    return this.preparedInvitation ? this.buildInvitationUrl(this.preparedInvitation) : '';
  }

  private buildInvitationUrl(invitation: Invitation): string {
    return this.buildEventUrl(invitation.invitationToken, Boolean(invitation.externalUserId), invitation.eventId);
  }

  private buildEventUrl(invitationToken?: string, guest = false, eventId = this.event?.id): string {
    const baseUrl = `${window.location.origin}/events/event/${eventId}`;
    if (!invitationToken) {
      return baseUrl;
    }

    const params = new URLSearchParams({ invitation: invitationToken });
    if (guest) {
      params.set('guest', 'true');
    }
    return `${baseUrl}?${params.toString()}`;
  }

  private upsertInvitation(invitation: Invitation): void {
    const invitations = this.event?.invitations ?? [];
    const existingIndex = invitations.findIndex(item => item.id === invitation.id);
    if (existingIndex >= 0) {
      invitations[existingIndex] = invitation;
      return;
    }
    invitations.push(invitation);
  }

  handleExternalInvitation(action: 'accept' | 'reject'): void {
    if (!this.externalUserId || !this.invitationToken || !this.event) {
      this.externalInvitationActionStatus = 'error';
      this.externalInvitationActionMessage = 'Invitation link is incomplete';
      this.toastr.error('Invitation link is incomplete');
      return;
    }

    if (action === 'accept') {
      void this.acceptExternalInvitation();
      return;
    }

    void this.rejectExternalInvitation();
  }

  private async acceptExternalInvitation(): Promise<void> {
    if (!this.externalUserId || !this.invitationToken || !this.event) {
      return;
    }

    this.externalInvitationActionLoading = true;
    this.externalInvitationActionStatus = 'idle';
    this.externalInvitationActionMessage = null;
    try {
      const response = await this.eventsService.acceptExternalInvitation(
        this.externalUserId,
        this.buildExternalInvitationActionPayload(),
      );
      if (!response.success) {
        const message = (response as ParticipationErrorResponse).message ?? 'Could not accept invitation';
        this.externalInvitationActionStatus = 'error';
        this.externalInvitationActionMessage = message;
        this.toastr.error(message, 'Invitation failed');
        return;
      }

      this.externalInvitationActionStatus = 'success';
      this.externalInvitationActionMessage = 'Invitation accepted successfully';
      this.toastr.success('Invitation accepted');
      await this.getEvent(this.event.id, this.invitationToken);
    } finally {
      this.externalInvitationActionLoading = false;
    }
  }

  private async rejectExternalInvitation(): Promise<void> {
    if (!this.externalUserId || !this.invitationToken || !this.event) {
      return;
    }

    this.externalInvitationActionLoading = true;
    this.externalInvitationActionStatus = 'idle';
    this.externalInvitationActionMessage = null;
    try {
      const response = await this.eventsService.rejectExternalInvitation(
        this.externalUserId,
        this.buildExternalInvitationActionPayload(),
      );
      if (!response.success) {
        const message = response.message ?? 'Could not reject invitation';
        this.externalInvitationActionStatus = 'error';
        this.externalInvitationActionMessage = message;
        this.toastr.error(message, 'Invitation failed');
        return;
      }

      this.externalInvitationActionStatus = 'success';
      this.externalInvitationActionMessage = 'Invitation rejected successfully';
      this.toastr.success('Invitation rejected');
      await this.router.navigate(['/events']);
    } finally {
      this.externalInvitationActionLoading = false;
    }
  }

  private buildExternalInvitationActionPayload(): ExternalInvitationActionDto {
    return {
      eventId: this.event?.id,
      invitation: this.invitationToken!,
    };
  }
}
