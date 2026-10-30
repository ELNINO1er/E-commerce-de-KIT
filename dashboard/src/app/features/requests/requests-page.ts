import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { problemMessage } from '../../core/api/problem-detail';

type ContactRequest = { id:number; name:string; company:string; email:string; phone:string; subject:string; product:string; message:string; status:'NEW'|'HANDLED'; created_at:string };
type Readiness = { mode:string; enabled:boolean; checks:Record<string,boolean> };
type Review = {order_number:string; reference:string; status:string; amount:number; currency:string; refunded_amount:number};

@Component({
  selector:'app-requests-page', imports:[RouterLink], changeDetection:ChangeDetectionStrategy.OnPush,
  template:`
    <header><h1>Demandes et préparation du paiement</h1><p>Messages enregistrés, environnement Stripe et transactions à vérifier.</p></header>
    @if(error()){<p class="error" role="alert">{{error()}}</p>}
    <section><h2>Stripe : {{readiness()?.mode === 'live' ? 'production' : 'sandbox / test'}}</h2>
      <p>Les commandes sandbox ne constituent pas des ventes réelles et sont exclues du chiffre d’affaires encaissé.</p>
      @for(check of checks();track check.key){<p class="check"><span>{{check.ok ? '✓' : 'À configurer'}}</span> {{check.label}}</p>}
      <p>Les clés se renseignent sur le serveur dans api/.env. Elles ne sont jamais affichées ici.</p>
    </section>
    <section><h2>Transactions à rapprocher</h2>
      @if(!reviews().length){<p>Aucune transaction signalée par le serveur.</p>}
      @for(review of reviews();track review.reference){<article><a [routerLink]="['/commandes',review.order_number]">{{review.order_number}}</a><p>{{review.reference}} · {{review.status}} · {{money(review.amount)}}.</p><p>Vérifier cette transaction dans Stripe avant toute expédition. Une annulation ne rembourse pas un paiement.</p></article>}
    </section>
    <section><h2>Messages clients</h2><button type="button" (click)="load()" [disabled]="loading()">Actualiser</button>
      @if(loading()){<p role="status">Chargement…</p>}
      @if(!loading()&&!requests().length){<p>Aucune demande enregistrée.</p>}
      @for(request of requests();track request.id){<article>
        <h3>KIC-MSG-{{request.id}} · {{request.subject}} <small>{{request.status === 'NEW' ? 'À traiter' : 'Traitée'}}</small></h3>
        <p>{{request.name}} · {{request.company}} · {{request.created_at}}</p>
        <p><a [href]="'mailto:'+request.email">{{request.email}}</a> · <a [href]="'tel:'+request.phone">{{request.phone}}</a></p>
        <p>{{request.product}}</p><p class="message">{{request.message}}</p>
        <button type="button" [disabled]="saving()" (click)="mark(request)">{{request.status === 'NEW' ? 'Marquer comme traitée' : 'Remettre à traiter'}}</button>
      </article>}
      <nav aria-label="Pagination des demandes"><button (click)="page.set(page()-1);load()" [disabled]="page()===0||loading()">Précédent</button><span>Page {{page()+1}}</span><button (click)="page.set(page()+1);load()" [disabled]="!hasNext()||loading()">Suivant</button></nav>
    </section>`,
  styles:[`header{margin-bottom:24px}h1{font-size:30px;margin:0 0 8px}section{background:var(--scmc-panel,#fff);border:1px solid var(--scmc-border,#e6ddd4);border-radius:16px;padding:24px;margin-bottom:24px}article{padding:20px 0;border-top:1px solid var(--scmc-border,#e6ddd4)}article:first-of-type{margin-top:18px}h2{font-size:21px}h3{font-size:17px}small{color:var(--scmc-muted);font-size:13px}.message{white-space:pre-wrap;overflow-wrap:anywhere}button{min-height:44px;padding:10px 18px;background:#fff5dc;border:1px solid #c9ae78;border-radius:9px;cursor:pointer;color:#462614}button:disabled{opacity:.55;cursor:default}a{color:#79502e;overflow-wrap:anywhere}.check{display:flex;gap:12px}.check span{min-width:110px;font-weight:700}.error{color:#a12020}nav{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:20px}`],
})
export class RequestsPage {
  private readonly api=inject(ApiService);
  protected readonly requests=signal<ContactRequest[]>([]);
  protected readonly readiness=signal<Readiness|null>(null);
  protected readonly reviews=signal<Review[]>([]);
  protected readonly error=signal('');protected readonly loading=signal(false);protected readonly saving=signal(false);
  protected readonly page=signal(0);protected readonly hasNext=signal(false);
  protected readonly checks=signal<{key:string;label:string;ok:boolean}[]>([]);
  constructor(){this.load();}
  protected money(amount:number){return new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(amount/100);}
  protected load(){
    this.loading.set(true);this.error.set('');
    forkJoin({requests:this.api.get<{content:ContactRequest[];totalElements:number}>('/admin/contact-requests',{page:this.page(),size:20}),readiness:this.api.get<Readiness>('/admin/payments/readiness'),reviews:this.api.get<Review[]>('/admin/payments/review')}).subscribe({next:r=>{
      this.requests.set(r.requests.content);this.hasNext.set((this.page()+1)*20<r.requests.totalElements);this.readiness.set(r.readiness);this.reviews.set(r.reviews);
      const labels:Record<string,string>={appKey:'Clé applicative',stripeKey:'Clé Stripe configurée',keyMode:'Clé conforme au mode sélectionné',paymentMode:'Mode reconnu',webhookSecret:'Signature du webhook',taxMode:'Qualification fiscale (obligatoire en production)',sellerRegistration:'Immatriculation (obligatoire en production)',salesTerms:'Conditions validées (obligatoire en production)',https:'Adresse de retour autorisée',curl:'Connexion PHP au prestataire'};
      this.checks.set(Object.entries(r.readiness.checks).map(([key,ok])=>({key,label:labels[key]??key,ok})));this.loading.set(false);
    },error:e=>{this.error.set(problemMessage(e));this.loading.set(false);}});
  }
  protected mark(request:ContactRequest){this.saving.set(true);this.api.put('/admin/contact-requests/'+request.id+'/status',{status:request.status==='NEW'?'HANDLED':'NEW'}).subscribe({next:()=>{this.saving.set(false);this.load();},error:e=>{this.error.set(problemMessage(e));this.saving.set(false);}});}
}
