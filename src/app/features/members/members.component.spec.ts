import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembersComponent } from './members.component';

/**
 * Members component unit tests
 */
describe('MembersComponent', () => {
  let component: MembersComponent;
  let fixture: ComponentFixture<MembersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Ensure the component is created */
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
