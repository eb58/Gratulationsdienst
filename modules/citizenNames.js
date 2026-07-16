const joined = values => values.map(value => String(value || '').trim()).filter(Boolean).join(' ');

export const citizenAddressName = citizen => joined([citizen?.salutation, citizen?.doctoralDegree, citizen?.firstName, citizen?.lastName]);
export const citizenDisplayName = citizen => joined([citizen?.doctoralDegree, citizen?.firstName, citizen?.lastName]);
export const citizenFormalName = citizen => joined([citizen?.salutation, citizen?.doctoralDegree, citizen?.lastName]);
export const citizenListName = citizen => [citizen?.lastName, joined([citizen?.doctoralDegree, citizen?.firstName])]
  .map(value => String(value || '').trim())
  .filter(Boolean)
  .join(', ');
