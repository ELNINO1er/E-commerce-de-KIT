import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { problemMessage } from '../../../../core/api/problem-detail';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { NotAnAdminError, SessionStore } from '../../application/session.store';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly i18n = inject(TranslationService);

  protected readonly submitting = signal(false);
  protected readonly passwordVisible = signal(false);
  /** Erreur brute : le message en est derive dans la langue active. */
  private readonly error = signal<unknown>(null);

  protected readonly errorMessage = computed(() => {
    const raw = this.error();
    if (!raw) {
      return null;
    }
    if (raw instanceof NotAnAdminError) {
      return this.i18n.t('login.error.notAdmin');
    }
    return problemMessage(raw, {
      network: this.i18n.t('error.network'),
      unexpected: this.i18n.t('error.unexpected'),
    });
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.session.login(this.form.getRawValue()).subscribe({
      next: () => {
        const redirect = this.route.snapshot.queryParamMap.get('redirect');
        void this.router.navigateByUrl(redirect && redirect !== '/login' ? redirect : '/');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(error);
      },
    });
  }
}
