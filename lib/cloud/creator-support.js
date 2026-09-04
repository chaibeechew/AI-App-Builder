import { createCreatorSupportDataAdapter } from "../cloud-adapters/creator-support-data.js";

function adapter(){return createCreatorSupportDataAdapter();}

export async function loadCreatorSupportStatus(){return adapter().loadCreatorSupportStatus();}
export async function submitCreatorSupportRequest(input){return adapter().submitCreatorSupportRequest(input);}
export async function redeemCreatorSupportCode(input){return adapter().redeemCreatorSupportCode(input);}
export async function loadCreatorSupportAdmin(){return adapter().loadCreatorSupportAdmin();}
export async function setCreatorSupportApprovalMode(input){return adapter().setCreatorSupportApprovalMode(input);}
export async function reviewCreatorSupportRequest(input){return adapter().reviewCreatorSupportRequest(input);}
export async function loadProjectMigrationAgreement(input){return adapter().loadProjectMigrationAgreement(input);}
export async function signProjectMigrationAgreement(input){return adapter().signProjectMigrationAgreement(input);}
