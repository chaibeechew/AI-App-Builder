import {
  evaluateAppSaleTruthGateData,
  getActiveLegalDocumentData,
  getAppOwnerData,
  getCurrentLegalAssuranceData,
  getCurrentLegalPrincipalData,
  getLegalSaleTransactionData,
  insertLegalAcceptanceEventData,
} from "../cloud-adapters/legal-runtime-data.js";

export async function getCurrentLegalPrincipal(){
  return getCurrentLegalPrincipalData();
}

export async function getCurrentLegalAssurance(){
  return getCurrentLegalAssuranceData();
}

export async function getActiveLegalDocument(documentKey){
  return getActiveLegalDocumentData(documentKey);
}

export async function getLegalSaleTransaction(transactionId){
  return getLegalSaleTransactionData(transactionId);
}

export async function getAppOwner(appId){
  return getAppOwnerData(appId);
}

export async function insertLegalAcceptanceEvent(record){
  return insertLegalAcceptanceEventData(record);
}

export async function evaluateAppSaleTruthGate(transactionId){
  return evaluateAppSaleTruthGateData(transactionId);
}
