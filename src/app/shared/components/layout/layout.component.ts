import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { TelegramService } from '../../../core/services/telegram.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent implements OnInit {
  private readonly telegram = inject(TelegramService);
  private readonly theme = inject(ThemeService);

  ngOnInit(): void {
    this.telegram.init();
  }
}
