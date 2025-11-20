import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-button-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button-loader.component.html',
  styleUrl: './button-loader.component.css'
})
export class ButtonLoaderComponent {
  @Input() loading: boolean = false;
  @Input() disabled: boolean = false;
  @Input() btnClass: string = '';
  @Input() type: string = 'button';
  @Output() action = new EventEmitter<void>();

  onClick(event: Event): void {
    event.stopPropagation();
    if (!this.loading && !this.disabled) {
      this.action.emit();
    }
  }
}
