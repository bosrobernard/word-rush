import {
  trigger,
  state,
  style,
  animate,
  transition,
  keyframes,
  query,
  stagger,
  animateChild,
  group,
} from '@angular/animations';

export const slideDown = trigger('slideDown', [
  transition(':enter', [
    style({ transform: 'translateY(-32px)', opacity: 0 }),
    animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translateY(0)', opacity: 1 })),
  ]),
]);

export const fadeUp = trigger('fadeUp', [
  transition(':enter', [
    style({ transform: 'translateY(24px)', opacity: 0 }),
    animate('550ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translateY(0)', opacity: 1 })),
  ]),
]);

export const tileEnter = trigger('tileEnter', [
  transition(':enter', [
    style({ transform: 'scale(0.4) rotateY(90deg)', opacity: 0 }),
    animate('400ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1) rotateY(0)', opacity: 1 })),
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ transform: 'scale(0.5)', opacity: 0 })),
  ]),
]);

export const slotPopIn = trigger('slotPopIn', [
  transition('void => filled', [
    style({ transform: 'scale(0.3) translateY(-10px)', opacity: 0 }),
    animate('280ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1) translateY(0)', opacity: 1 })),
  ]),
  transition('filled => void', [
    animate('150ms ease-in', style({ transform: 'scale(0.4)', opacity: 0 })),
  ]),
]);

export const shake = trigger('shake', [
  transition('* => shake', [
    animate('420ms ease', keyframes([
      style({ transform: 'translateX(0)', offset: 0 }),
      style({ transform: 'translateX(-8px)', offset: 0.2 }),
      style({ transform: 'translateX(8px)', offset: 0.4 }),
      style({ transform: 'translateX(-5px)', offset: 0.6 }),
      style({ transform: 'translateX(5px)', offset: 0.8 }),
      style({ transform: 'translateX(0)', offset: 1.0 }),
    ])),
  ]),
]);

export const toastAnim = trigger('toastAnim', [
  transition(':enter', [
    style({ transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 }),
    animate('320ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 })),
  ]),
  transition(':leave', [
    animate('220ms ease-in', style({ transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0 })),
  ]),
]);

export const reactionFloat = trigger('reactionFloat', [
  transition(':enter', [
    style({ transform: 'translateY(0) scale(0)', opacity: 0 }),
    animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translateY(-20px) scale(1)', opacity: 1 })),
  ]),
  transition(':leave', [
    animate('800ms ease-out', keyframes([
      style({ transform: 'translateY(-20px) scale(1)', opacity: 1, offset: 0 }),
      style({ transform: 'translateY(-80px) scale(0.8)', opacity: 0.6, offset: 0.7 }),
      style({ transform: 'translateY(-120px) scale(0.4)', opacity: 0, offset: 1 }),
    ])),
  ]),
]);

export const floatingScore = trigger('floatingScore', [
  transition(':enter', [
    style({ transform: 'translateY(0) scale(0.5)', opacity: 0 }),
    animate('250ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translateY(-10px) scale(1)', opacity: 1 })),
  ]),
  transition(':leave', [
    animate('700ms ease-out', keyframes([
      style({ transform: 'translateY(-10px)', opacity: 1, offset: 0 }),
      style({ transform: 'translateY(-60px)', opacity: 0, offset: 1 }),
    ])),
  ]),
]);

export const countdownPop = trigger('countdownPop', [
  transition('* => *', [
    style({ transform: 'scale(0.3)', opacity: 0 }),
    animate('400ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1)', opacity: 1 })),
  ]),
]);

export const playerRowEnter = trigger('playerRowEnter', [
  transition(':enter', [
    style({ transform: 'translateX(-20px)', opacity: 0 }),
    animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'translateX(0)', opacity: 1 })),
  ]),
]);

export const staggerList = trigger('staggerList', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(12px)' }),
      stagger(60, [
        animate('300ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ], { optional: true }),
  ]),
]);

export const buzzPulse = trigger('buzzPulse', [
  state('open', style({ boxShadow: '0 0 40px rgba(0,200,255,0.6)', borderColor: 'rgba(0,200,255,0.8)' })),
  state('closed', style({ boxShadow: 'none', borderColor: 'rgba(0,130,210,0.14)' })),
  transition('closed => open', animate('300ms ease-out')),
  transition('open => closed', animate('200ms ease-in')),
]);

export const roundReveal = trigger('roundReveal', [
  transition(':enter', [
    query('.p-tile', [
      style({ transform: 'scale(0) rotateZ(-15deg)', opacity: 0 }),
      stagger(80, [
        animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ transform: 'scale(1) rotateZ(0)', opacity: 1 })),
      ]),
    ], { optional: true }),
  ]),
]);
