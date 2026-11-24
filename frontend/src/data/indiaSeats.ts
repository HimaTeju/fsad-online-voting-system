// Real Lok Sabha seat counts per state/UT (543 total, as of 2024 elections)
// Source: Election Commission of India
export interface StateSeats {
  name: string;
  seats: number;
  type: 'state' | 'ut';
}

export const STATE_SEATS: StateSeats[] = [
  // Large states
  { name: 'Uttar Pradesh',       seats: 80, type: 'state' },
  { name: 'Maharashtra',         seats: 48, type: 'state' },
  { name: 'West Bengal',         seats: 42, type: 'state' },
  { name: 'Bihar',               seats: 40, type: 'state' },
  { name: 'Tamil Nadu',          seats: 39, type: 'state' },
  { name: 'Madhya Pradesh',      seats: 29, type: 'state' },
  { name: 'Rajasthan',           seats: 25, type: 'state' },
  { name: 'Karnataka',           seats: 28, type: 'state' },
  { name: 'Gujarat',             seats: 26, type: 'state' },
  { name: 'Andhra Pradesh',      seats: 25, type: 'state' },
  // Medium states
  { name: 'Odisha',              seats: 21, type: 'state' },
  { name: 'Telangana',           seats: 17, type: 'state' },
  { name: 'Jharkhand',           seats: 14, type: 'state' },
  { name: 'Assam',               seats: 14, type: 'state' },
  { name: 'Punjab',              seats: 13, type: 'state' },
  { name: 'Chhattisgarh',        seats: 11, type: 'state' },
  { name: 'Haryana',             seats: 10, type: 'state' },
  { name: 'Kerala',              seats: 20, type: 'state' },
  { name: 'Uttarakhand',         seats:  5, type: 'state' },
  { name: 'Himachal Pradesh',    seats:  4, type: 'state' },
  // Smaller states
  { name: 'Jammu & Kashmir',     seats:  5, type: 'ut'    },
  { name: 'Tripura',             seats:  2, type: 'state' },
  { name: 'Meghalaya',           seats:  2, type: 'state' },
  { name: 'Manipur',             seats:  2, type: 'state' },
  { name: 'Nagaland',            seats:  1, type: 'state' },
  { name: 'Arunachal Pradesh',   seats:  2, type: 'state' },
  { name: 'Mizoram',             seats:  1, type: 'state' },
  { name: 'Sikkim',              seats:  1, type: 'state' },
  { name: 'Goa',                 seats:  2, type: 'state' },
  // Union Territories
  { name: 'Delhi',               seats:  7, type: 'ut'    },
  { name: 'Puducherry',          seats:  1, type: 'ut'    },
  { name: 'Chandigarh',          seats:  1, type: 'ut'    },
  { name: 'Ladakh',              seats:  1, type: 'ut'    },
  { name: 'Dadra & Nagar Haveli',seats:  2, type: 'ut'    },
  { name: 'Daman & Diu',         seats:  1, type: 'ut'    },
  { name: 'Lakshadweep',         seats:  1, type: 'ut'    },
  { name: 'Andaman & Nicobar',   seats:  1, type: 'ut'    },
];

// Map TopoJSON property names → our state names
// The datameet India TopoJSON uses "NAME_1" for state names
export const TOPOJSON_NAME_MAP: Record<string, string> = {
  'Andaman and Nicobar':                'Andaman & Nicobar',
  'Andaman & Nicobar Island':           'Andaman & Nicobar',
  'Andaman and Nicobar Island':         'Andaman & Nicobar',
  'Andhra Pradesh':                     'Andhra Pradesh',
  'Arunachal Pradesh':                  'Arunachal Pradesh',
  'Assam':                              'Assam',
  'Bihar':                              'Bihar',
  'Chandigarh':                         'Chandigarh',
  'Chhattisgarh':                       'Chhattisgarh',
  'Dadra and Nagar Haveli':             'Dadra & Nagar Haveli',
  'Dadra & Nagar Haveli':               'Dadra & Nagar Haveli',
  'Daman and Diu':                      'Daman & Diu',
  'Goa':                                'Goa',
  'Gujarat':                            'Gujarat',
  'Haryana':                            'Haryana',
  'Himachal Pradesh':                   'Himachal Pradesh',
  'Jammu and Kashmir':                  'Jammu & Kashmir',
  'Jammu & Kashmir':                    'Jammu & Kashmir',
  'Jharkhand':                          'Jharkhand',
  'Karnataka':                          'Karnataka',
  'Kerala':                             'Kerala',
  'Ladakh':                             'Ladakh',
  'Lakshadweep':                        'Lakshadweep',
  'Madhya Pradesh':                     'Madhya Pradesh',
  'Maharashtra':                        'Maharashtra',
  'Manipur':                            'Manipur',
  'Meghalaya':                          'Meghalaya',
  'Mizoram':                            'Mizoram',
  'Nagaland':                           'Nagaland',
  'NCT of Delhi':                       'Delhi',
  'Delhi':                              'Delhi',
  'Odisha':                             'Odisha',
  'Orissa':                             'Odisha',
  'Puducherry':                         'Puducherry',
  'Pondicherry':                        'Puducherry',
  'Punjab':                             'Punjab',
  'Rajasthan':                          'Rajasthan',
  'Sikkim':                             'Sikkim',
  'Tamil Nadu':                         'Tamil Nadu',
  'Telangana':                          'Telangana',
  'Tripura':                            'Tripura',
  'Uttar Pradesh':                      'Uttar Pradesh',
  'Uttarakhand':                        'Uttarakhand',
  'Uttaranchal':                        'Uttarakhand',
  'West Bengal':                        'West Bengal',
};

export const SEATS_BY_STATE: Record<string, number> = Object.fromEntries(
  STATE_SEATS.map(s => [s.name, s.seats])
);

// Colour scale: 5 bands based on seat count
export function seatColor(seats: number, isHovered = false, isKarnataka = false): string {
  if (isKarnataka) return isHovered ? '#b84e1a' : '#E8622A';
  const base =
    seats >= 40 ? '#1a3a5c' :
    seats >= 20 ? '#1d5c8a' :
    seats >= 10 ? '#2d7aaa' :
    seats >=  5 ? '#5a9ec4' :
                  '#96c4dc';
  if (isHovered) {
    return seats >= 40 ? '#0f2540' :
           seats >= 20 ? '#123f6b' :
           seats >= 10 ? '#1d5c8a' :
           seats >=  5 ? '#3a7fa8' :
                         '#72a8c8';
  }
  return base;
}
