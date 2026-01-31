import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleBadgeComponent } from './role-badge.component';

/**
 * Role badge component unit tests
 */
describe('RoleBadgeComponent', () => {
  let component: RoleBadgeComponent;
  let fixture: ComponentFixture<RoleBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleBadgeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Ensure the component is created */
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
