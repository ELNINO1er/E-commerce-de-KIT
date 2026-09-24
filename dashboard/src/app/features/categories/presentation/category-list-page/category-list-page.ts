import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { fieldErrors, problemMessage } from '../../../../core/api/problem-detail';
import { TranslatePipe } from '../../../../core/i18n/t.pipe';
import { TranslationService } from '../../../../core/i18n/translation.service';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DataTable } from '../../../../shared/ui/data-table/data-table';
import { Icon } from '../../../../shared/ui/icon/icon';
import { Modal } from '../../../../shared/ui/modal/modal';
import { matchesSearch } from '../../../../shared/domain/search';
import { SearchField } from '../../../../shared/ui/search-field/search-field';
import { Select, SelectOption } from '../../../../shared/ui/select/select';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Category } from '../../domain/models/category.model';
import { CategoryStore } from '../../application/category.store';

@Component({
  selector: 'app-category-list-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    Icon,
    Modal,
    Select,
    DataTable,
    SearchField,
    ConfirmDialog,
  ],
  templateUrl: './category-list-page.html',
  styleUrl: './category-list-page.scss',
})
export class CategoryListPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly store = inject(CategoryStore);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);

  protected readonly loading = this.store.loading;

  /**
   * Recherche locale : l'API renvoie la liste complete, le filtrage en memoire
   * est donc exhaustif — pas un tri de la seule page affichee.
   */
  protected readonly search = signal('');
  protected readonly categories = computed(() =>
    this.store
      .categories()
      .filter((category) => matchesSearch(this.search(), category.name, category.slug)),
  );

  /** `null` = fermee ; une categorie = edition ; `'new'` = creation. */
  protected readonly editing = signal<Category | 'new' | null>(null);
  protected readonly pendingDeletion = signal<Category | null>(null);
  protected readonly saving = signal(false);

  private readonly error = signal<unknown>(null);
  protected readonly errorMessage = computed(() => {
    const raw = this.error();
    return raw
      ? problemMessage(raw, {
          network: this.i18n.t('error.network'),
          unexpected: this.i18n.t('error.unexpected'),
        })
      : null;
  });
  protected readonly serverFieldErrors = computed(() => fieldErrors(this.error()));

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    slug: [''],
    parentId: this.formBuilder.control<number | null>(null),
  });

  protected readonly dialogTitle = computed(() =>
    this.i18n.t(this.editing() === 'new' ? 'categories.form.new' : 'categories.form.edit'),
  );

  protected readonly deleteMessage = computed(() => {
    const category = this.pendingDeletion();
    return category ? this.i18n.t('categories.delete.message', { name: category.name }) : '';
  });

  /**
   * Parents possibles. La categorie en cours d'edition est retiree : se prendre
   * soi-meme pour parent creerait un cycle immediat.
   */
  protected readonly parentOptions = computed<SelectOption[]>(() => {
    const current = this.editing();
    const currentId = current !== null && current !== 'new' ? current.id : null;
    return [
      { value: null, label: this.i18n.t('categories.form.noParent') },
      // Liste **complete** du store, pas la liste filtree par la recherche :
      // une recherche en cours ne doit pas amputer les parents proposes.
      ...this.store
        .categories()
        .filter((category) => category.id !== currentId)
        .map((category) => ({ value: category.id, label: category.name })),
    ];
  });

  constructor() {
    this.store.load();
  }

  protected parentName(category: Category): string {
    return this.store.nameOf(category.parentId) ?? '—';
  }

  protected openCreate(): void {
    this.error.set(null);
    this.form.reset({ name: '', slug: '', parentId: null });
    this.editing.set('new');
  }

  protected openEdit(category: Category): void {
    this.error.set(null);
    this.form.reset({
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
    });
    this.editing.set(category);
  }

  protected close(): void {
    this.editing.set(null);
    this.saving.set(false);
  }

  protected submit(): void {
    const current = this.editing();
    if (this.form.invalid || this.saving() || current === null) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request = {
      name: value.name.trim(),
      // Laisse le serveur deriver le slug du nom quand le champ est vide.
      slug: value.slug.trim() || undefined,
      parentId: value.parentId,
    };

    this.saving.set(true);
    this.error.set(null);

    const call =
      current === 'new' ? this.store.create(request) : this.store.update(current.id, request);

    call.subscribe({
      next: () => {
        this.close();
        this.toast.successKey('common.saved');
      },
      // L'erreur reste **dans** la modale : elle porte souvent des messages par
      // champ (`errors[]`) qu'il faut lire a cote des champs concernes.
      error: (error: unknown) => {
        this.error.set(error);
        this.saving.set(false);
      },
    });
  }

  protected confirmDeletion(): void {
    const category = this.pendingDeletion();
    this.pendingDeletion.set(null);
    if (!category) {
      return;
    }

    this.store.remove(category.id).subscribe({
      next: () => this.toast.successKey('common.deleted'),
      // 409 quand des produits y sont encore rattaches : le backend le dit.
      error: (error: unknown) => this.toast.apiError(error),
    });
  }
}
