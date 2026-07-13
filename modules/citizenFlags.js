export const isDeceasedCitizen = citizen => citizen?.deceased === true;
export const isMovedCitizen = citizen => citizen?.moved === true;
export const hasCitizenExclusionFlag = citizen => isDeceasedCitizen(citizen) || isMovedCitizen(citizen);
export const citizenFlagText = citizen => [isDeceasedCitizen(citizen) ? 'verstorben' : '', isMovedCitizen(citizen) ? 'verzogen' : ''].filter(Boolean).join(', ');
