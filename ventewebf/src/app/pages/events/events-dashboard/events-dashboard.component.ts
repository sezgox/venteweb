import { Component, inject, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { EventCardComponent } from '../../../components/shared/event-card/event-card.component';
import { HeaderComponent } from '../../../components/shared/header/header.component';
import { ManageEventsSuccessResponse, RequestCollaborationErrorResponse } from '../../../core/interfaces/api-response.interface';
import { Event, Invitation, Participation, Request } from '../../../core/interfaces/events.interfaces';
import { ManageEvents } from '../../../core/interfaces/manage-events.interface';
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
  imports: [HeaderComponent, EventCardComponent],
  templateUrl: './events-dashboard.component.html',
  styleUrl: './events-dashboard.component.css'
})
export class EventsDashboardComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly eventsService = inject(EventsService);
  private readonly toastr = inject(ToastrService);

  optionSelected: string = 'events';
  managedEvents: ManageEvents | null = null;

  events: CategorizedEvents = {
    upcoming: [],
    inProgress: [],
    finished: []
  };
  participations: CategorizedParticipations = {
    upcoming: [],
    inProgress: [],
    finished: []
  };

  dialogType: 'invitation' | 'participation' | 'request' = 'invitation';
  showDialog: boolean = false;
  invitationDialog: Invitation | null = null;
  participationDialog: Participation | null = null;
  requestDialog: Request | null = null;

  ngOnInit(): void {
    this.getManagedEvents();
  }

  async getManagedEvents(){
    const res = await this.usersService.getManagedEvents();
    if(res.success){
      this.managedEvents = (res as ManageEventsSuccessResponse).results;
      console.log(this.managedEvents);
      this.categorizeEvents();
    }else{
      console.log(res.message);
    }
  }

  categorizeEvents(){
    this.events.upcoming = this.managedEvents?.events.filter(event => new Date(event.startDate) > new Date()) ?? [];
    this.events.inProgress = this.managedEvents?.events.filter(event => new Date(event.startDate) <= new Date() && new Date(event.endDate) > new Date()) ?? [];
    this.events.finished = this.managedEvents?.events.filter(event => new Date(event.endDate) <= new Date()) ?? [];
    this.participations.upcoming = this.managedEvents?.participations.filter(participation => new Date(participation.event.startDate) > new Date()) ?? [];
    this.participations.inProgress = this.managedEvents?.participations.filter(participation => new Date(participation.event.startDate) <= new Date() && new Date(participation.event.endDate) > new Date()) ?? [];
    this.participations.finished = this.managedEvents?.participations.filter(participation => new Date(participation.event.endDate) <= new Date()) ?? [];
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
    const participationDto = {
      userId: invitation.userId,
      eventId: invitation.eventId,
      type: invitation.type,
      invitationId: invitation.id,
      invitation: invitation.invitationToken
    }
    const res = await this.usersService.acceptInvitation(invitation.userId, participationDto);
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
