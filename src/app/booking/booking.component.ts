import {ChangeDetectionStrategy, Component, Inject, Injector} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  EMPTY,
  filter,
  map,
  Observable,
  of,
  share,
  startWith,
  switchMap
} from 'rxjs';
import {tuiIsPresent} from '@taiga-ui/cdk';
import {BookingService} from '../services/booking.service';
import {Booking} from '../../assets/model/booking.schema';
import {PolymorpheusComponent} from '@tinkoff/ng-polymorpheus';
import {SharedService} from '../shared/shared.service';
import {TuiDialogService} from '@taiga-ui/core';
import {AddEditBookingDialogComponent} from './add-edit-booking-dialog/add-edit-booking-dialog.component';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingComponent {

  readonly refreshBookings$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  mode$: Observable<string> = of('');
  readonly columns = [`index`, `roomNumber`, `guest`, `arrivalDate`, `departureDate`, `owner`, `lessor`,
    `portal`, `bill`, `actions`];
  readonly size$ = new BehaviorSubject(10);
  readonly page$ = new BehaviorSubject(0);

  readonly total$ = this.refreshBookings$.pipe(
    switchMap(_ =>
      this.bookingService.getCount().pipe(
        filter(tuiIsPresent),
        startWith(1),
      )));

  readonly getAll$ = this.refreshBookings$.pipe(
    switchMap(_ =>
      combineLatest([
        this.page$,
        this.size$,
      ]).pipe(
        switchMap(query => this.getData(...query).pipe(startWith(null))),
        share(),
      )));

  readonly data$: Observable<readonly Booking[]> = this.getAll$.pipe(
    filter(tuiIsPresent),
    map(bookings => bookings.filter(tuiIsPresent)),
    startWith([]),
  );

  constructor(private route: ActivatedRoute,
              private bookingService: BookingService,
              private readonly sharedService: SharedService,
              @Inject(TuiDialogService) private readonly dialogService: TuiDialogService,
              @Inject(Injector) private readonly injector: Injector) {
    this.mode$ = this.route.url.pipe(
      map(params => params[0].path)
    );
  }

  getData(page: number, size: number): Observable<ReadonlyArray<Booking | null>> {
    const start = page * size;
    return this.bookingService.getAll(start, size);
  }

  add(): void {
    this.openAddEditBookingDialog('Add active room');
  }

  update(booking: Booking): void {
    this.openAddEditBookingDialog('Edit active room', booking);
  }

  delete(booking: Booking): void {
    this.sharedService.initYesNoDialog(`active room for ${booking.client.name} ${booking.client.surname}`)
      .pipe(
        switchMap((res: boolean) =>
          res ? this.bookingService.delete(booking) : EMPTY
        ),
      ).subscribe((res: Booking[]) => this.refreshBookings$.next(true));
  }

  openAddEditBookingDialog(label: string, booking: Booking = new Booking()) {
    this.dialogService.open<Booking>(
      new PolymorpheusComponent(AddEditBookingDialogComponent, this.injector),
      {
        label,
        data: booking,
        size: `m`,
        dismissible: false
      },
    )
      .pipe(
        switchMap((res: Booking) => res ? this.bookingService.save(res) : EMPTY)
      )
      .subscribe(() => this.refreshBookings$.next(true));
  }

  trackByFn(index) {
    return index;
  }

  onSize(size: number): void {
    this.size$.next(size);
  }

  onPage(page: number): void {
    this.page$.next(page);
  }

}
