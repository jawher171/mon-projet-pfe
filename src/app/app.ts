/**
 * Root Component of the Application
 * This is the main component that serves as the container for the entire application.
 * It provides the RouterOutlet where all routed components are rendered.
 */

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule,HttpClient} from '@angular/common/http';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, HttpClientModule, FormsModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
