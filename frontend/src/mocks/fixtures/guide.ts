import type { BookingResponse, GuideResponse, ReviewSummaryResponse } from '../../types/api';

/**
 * F-1201..F-1203 fixtures for the tour guide dashboard.
 *
 * The profile id is the single value the dashboard uses to address the
 * authenticated guide. Handlers always return this profile for `/me`, so a
 * guide can never be handed another guide's record.
 */
export const MOCK_GUIDE_ID = '55555555-5555-5555-5555-555555555555';
export const MOCK_GUIDE_USER_ID = '55555555-5555-5555-5555-555555555501';

export const mockGuideProfile: GuideResponse = {
  id: MOCK_GUIDE_ID,
  userId: MOCK_GUIDE_USER_ID,
  fullName: 'Demeke Tolossa',
  phoneNumber: '+251911223344',
  licenseNumber: 'ETH-GUIDE-4471',
  bio: 'I have guided visitors through the Hamer and Dasenech villages for nine years.',
  languages: ['Amharic', 'English', 'Hamer'],
  specialties: 'Cultural ceremonies, river crossings, coffee ceremony',
  dailyRate: 1800,
  currency: 'ETB',
  verificationStatus: 'VERIFIED',
  isAvailable: true,
};

export const mockAssignedBookings: BookingResponse[] = [
  {
    id: '66666666-6666-6666-6666-666666666601',
    bookingCode: 'BK-2041',
    enterpriseName: 'Turmi Community Hub',
    buyerName: 'Ana Ribeiro',
    visitDate: '2026-11-04',
    partySize: 4,
    contactName: 'Ana Ribeiro',
    contactPhone: '+351912000111',
    specialRequests: 'We would like to attend the evangadi ceremony if it falls on that day.',
    totalAmount: 7200,
    currency: 'ETB',
    status: 'REQUESTED',
  },
  {
    id: '66666666-6666-6666-6666-666666666602',
    bookingCode: 'BK-2033',
    enterpriseName: 'Dimeka Community Hub',
    buyerName: 'Jonas Weber',
    visitDate: '2026-10-28',
    partySize: 2,
    contactName: 'Jonas Weber',
    contactPhone: '+491510002222',
    totalAmount: 3600,
    currency: 'ETB',
    status: 'CONFIRMED',
  },
];

export const mockGuideReviews: ReviewSummaryResponse = {
  targetType: 'GUIDE',
  targetId: MOCK_GUIDE_ID,
  averageRating: 4.5,
  totalReviews: 2,
  reviews: [
    {
      id: '77777777-7777-7777-7777-777777777701',
      reviewerName: 'Ana Ribeiro',
      targetType: 'GUIDE',
      targetId: MOCK_GUIDE_ID,
      rating: 5,
      comment: 'Demeke explained every ceremony with real patience. Highly recommended.',
      createdAt: '2026-09-12T10:15:00Z',
    },
    {
      id: '77777777-7777-7777-7777-777777777702',
      reviewerName: 'Marta Silva',
      targetType: 'GUIDE',
      targetId: MOCK_GUIDE_ID,
      rating: 4,
      comment: 'Great knowledge of the area. The day ran a little long.',
      createdAt: '2026-08-30T16:40:00Z',
    },
  ],
};
