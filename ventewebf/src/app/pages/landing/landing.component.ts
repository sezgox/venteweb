import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/shared/navbar/navbar.component';

type LandingCard = {
  eyebrow: string;
  title: string;
  description: string;
};

type Capability = {
  title: string;
  description: string;
  accent: string;
};

type EventFormat = {
  title: string;
  description: string;
  detail: string;
};

type Testimonial = {
  quote: string;
  role: string;
  author: string;
};

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [NavbarComponent, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
})
export class LandingComponent {
  protected readonly pillars: LandingCard[] = [
    {
      eyebrow: 'Descubre',
      title: 'Planes que encajan contigo',
      description:
        'Desde una quedada privada hasta un festival, Vente te ayuda a encontrar eventos relevantes por ambiente, intereses y comunidad.'
    },
    {
      eyebrow: 'Organiza',
      title: 'Gestiona sin perder el control',
      description:
        'Invitaciones, aforo, seguimiento de asistencia y visibilidad en un solo flujo para organizar con claridad y escalar cuando toque.'
    },
    {
      eyebrow: 'Conecta',
      title: 'Convierte eventos en relaciones',
      description:
        'La capa social impulsa confianza, reputación y continuidad para que la experiencia no termine cuando acaba el evento.'
    }
  ];

  protected readonly capabilities: Capability[] = [
    {
      title: 'Promoción con contexto social',
      description:
        'Comparte eventos donde la gente ya interactúa, conversa y construye comunidad alrededor de intereses reales.',
      accent: 'accent-coral'
    },
    {
      title: 'Invitaciones y acceso flexible',
      description:
        'Invita asistentes, colaboradores o perfiles externos con flujos pensados para eventos cerrados, abiertos o híbridos.',
      accent: 'accent-amber'
    },
    {
      title: 'Seguimiento de aforo y asistencia',
      description:
        'Ten visibilidad del ritmo de participación, confirma asistencia y detecta cómo evoluciona el interés antes y durante el evento.',
      accent: 'accent-mint'
    },
    {
      title: 'Reputación, mérito y recompensas',
      description:
        'La plataforma premia la constancia organizativa y la participación útil para reforzar confianza y transparencia.',
      accent: 'accent-sky'
    }
  ];

  protected readonly formats: EventFormat[] = [
    {
      title: 'Eventos personales y privados',
      description:
        'Cumpleaños, reuniones, encuentros por invitación o celebraciones familiares con control simple y rápido.',
      detail: 'Privacidad, confirmaciones y comunicación sin fricción.'
    },
    {
      title: 'Comunidades, asociaciones y marcas',
      description:
        'Quedadas de comunidad, actividades culturales, acciones de marca, networking y ciclos temáticos.',
      detail: 'Promoción, recurrencia y seguimiento en un mismo espacio.'
    },
    {
      title: 'Grandes citas y experiencias masivas',
      description:
        'Conciertos, festivales, jornadas especiales o eventos con alto volumen de asistentes y múltiples perfiles implicados.',
      detail: 'Más estructura cuando el alcance y la operación crecen.'
    }
  ];

  protected readonly testimonials: Testimonial[] = [
    {
      quote:
        'Necesitábamos una forma seria de organizar eventos sin perder la parte social. Vente junta ambas capas y reduce mucho el trabajo manual.',
      role: 'Promotora cultural',
      author: 'Equipo organizador'
    },
    {
      quote:
        'La visibilidad de asistencia y el control de invitaciones nos da más seguridad para eventos privados y también para acciones abiertas.',
      role: 'Comunidad local',
      author: 'Administración del grupo'
    },
    {
      quote:
        'No es solo publicar un evento. La gente puede descubrirlo, apuntarse, volver y generar reputación dentro de la plataforma.',
      role: 'Colectivo creativo',
      author: 'Dirección de proyecto'
    }
  ];

  protected readonly workflowSteps: string[] = [
    'Crea el evento y define visibilidad, capacidad y dinámica.',
    'Promociónalo con una ficha cuidada y una capa social que lo haga circular.',
    'Gestiona invitaciones, confirmaciones y seguimiento antes del día clave.',
    'Convierte la asistencia en reputación, aprendizaje y comunidad para el siguiente evento.'
  ];
}
