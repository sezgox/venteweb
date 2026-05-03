import { Component, computed, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EventCardComponent } from '../../../components/shared/event-card/event-card.component';
import { RequestCollaborationErrorResponse } from '../../../core/interfaces/api-response.interface';
import { Event, Invitation, Participation, Request } from '../../../core/interfaces/events.interfaces';
import { EventsService } from '../../../core/services/events.service';
import { UsersService } from './../../../core/services/users.service';

interface CategorizedEvents{
  upcoming: Event[];
  inProgress: Event[];
  finished: Event[];
}

interface CategorizedParticipations{
  upcoming: Participation[];
  inProgress: Participation[];
  finished: Participation[];
}

@Component({
  selector: 'app-events-dashboard',
  standalone: true,
  imports: [EventCardComponent],
  templateUrl: './events-dashboard.component.html',
  styleUrl: './events-dashboard.component.css'
})
export class EventsDashboardComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly eventsService = inject(EventsService);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);

  optionSelected: 'events' | 'participations' = 'events';
  participationSection: 'participations' | 'invitations' | 'requests' = 'participations';
  readonly managedEvents = this.usersService.managedEvents;
  readonly eventsState = computed<CategorizedEvents>(() => {
    const managedEvents = this.managedEvents();
    const now = Date.now();
    const events = managedEvents?.events ?? [];
    return {
      upcoming: events.filter(event => new Date(event.startDate).getTime() > now),
      inProgress: events.filter(event => new Date(event.startDate).getTime() <= now && new Date(event.endDate).getTime() > now),
      finished: events.filter(event => new Date(event.endDate).getTime() <= now),
    };
  });
  readonly participationsState = computed<CategorizedParticipations>(() => {
    const managedEvents = this.managedEvents();
    const now = Date.now();
    const participations = managedEvents?.participations ?? [];
    return {
      upcoming: participations.filter(participation => new Date(participation.event.startDate).getTime() > now),
      inProgress: participations.filter(participation => new Date(participation.event.startDate).getTime() <= now && new Date(participation.event.endDate).getTime() > now),
      finished: participations.filter(participation => new Date(participation.event.endDate).getTime() <= now),
    };
  });

  dialogType: 'invitation' | 'participation' | 'request' = 'invitation';
  showDialog: boolean = false;
  invitationDialog: Invitation | null = null;
  participationDialog: Participation | null = null;
  requestDialog: Request | null = null;

  ngOnInit(): void {
    const currentUser = this.usersService.getCurrentUser();
    if (!currentUser) {
      this.toastr.info('Para ver los eventos debe iniciar sesión.', 'Login required');
      this.router.navigate(['/events/explore']);
      document.getElementById('auth-modal')?.showPopover();
      return;
    }
    this.getManagedEvents();
  }

  selectMainSection(section: 'events' | 'participations'): void {
    this.optionSelected = section;
    if (section === 'participations') {
      this.participationSection = 'participations';
    }
  }

  selectParticipationSection(section: 'participations' | 'invitations' | 'requests'): void {
    this.participationSection = section;
  }

  get events(): CategorizedEvents {
    return this.eventsState();
  }

  get participations(): CategorizedParticipations {
    return this.participationsState();
  }

  async getManagedEvents(){
    const res = await this.usersService.getManagedEvents();
    if(res.success){
      return;
    } else {
      this.toastr.error(res.message, 'Could not load managed events');
    }
  }

  async removeRequest(requestId: string, eventId: string){
    const res = await this.eventsService.removeRequest(requestId, eventId);
    if(res.success){
      this.getManagedEvents();
    }else{
      this.toastr.error((res as RequestCollaborationErrorResponse).message, 'Error canceling request')
    }
    this.showDialog = false;
  }

  async removeParticipation(participationId: string, eventId: string){
    const res = await this.eventsService.removeParticipation(participationId, eventId);
    if(res.success){
      this.toastr.success('Participation canceled');
      this.getManagedEvents();
    }else{
      this.toastr.error((res as RequestCollaborationErrorResponse).message, 'Error canceling participation')
    }
    this.showDialog = false;
  }

  async removeInvitation(invitation: Invitation){
    if (!invitation.userId) {
      this.toastr.error('This invitation is not linked to a registered user account', 'Error canceling invitation');
      this.showDialog = false;
      return;
    }
    const res = await this.usersService.rejectOrCancelInvitation(invitation.userId, invitation.id);
    if(res.success){
      this.toastr.success('Invitation rejected');
      this.getManagedEvents();
    }else{
      this.toastr.error((res as RequestCollaborationErrorResponse).message, 'Error canceling invitation')
    }
    this.showDialog = false;
  }

  async acceptInvitation(invitation: Invitation){
    const res = await this.eventsService.acceptInvitationByEventParticipation(
      invitation.eventId,
      invitation.id,
      invitation.invitationToken
    );
    if(res.success){
      this.toastr.success('Invitation accepted');
      this.getManagedEvents();
    }else{
      this.toastr.error((res as RequestCollaborationErrorResponse).message, 'Error accepting invitation')
    }
    this.showDialog = false;
  }

  openDialog(type: 'invitation' | 'participation' | 'request', data: Invitation | Participation | Request): void {
    this.invitationDialog = null;
    this.participationDialog = null;
    this.requestDialog = null;
    this.dialogType = type;
    if(type === 'invitation'){
      this.invitationDialog = data as Invitation;
    }
    if(type === 'participation'){
      this.participationDialog = data as Participation;
    }
    if(type === 'request'){
      this.requestDialog = data as Request;
    }
    this.showDialog = true;
  }

}
