// Types name the answer being requested, not merely a broad subject or an object name.
const TYPES={
 'domain-05-start-relationship':'relationship_establishment',
 'domain-05-reconcile':'relationship_reconciliation',
 'domain-05-marry':'marriage_completion',
 'domain-05-marriage-negotiation':'marriage_negotiation',
 'domain-05-married-life':'marriage_stability',
 'domain-09-job-offer':'job_application',
 'domain-09-promotion':'promotion',
 'domain-09-transfer':'job_transfer',
 'domain-09-examination':'examination_result',
 'domain-09-qualification':'qualification_result',
 'domain-10-business-income':'business_income',
 'domain-10-receivable':'receivable_collection',
 'domain-10-loan-return':'loan_repayment',
 'domain-10-refund':'refund_receipt',
 'domain-10-profit-share':'profit_distribution'
};
export function questionTypeFor({id,domainId,mode}){
 if(mode==='reference')return 'reference_'+id.replaceAll('-','_');
 if(domainId==='domain-15')return 'lost_object_recovery';
 if(domainId==='domain-13')return 'traveller_return';
 if(domainId==='domain-12')return 'own_journey_completion';
 if(domainId==='domain-04')return 'dwelling_compatibility';
 if(domainId==='domain-18')return 'burial_site_compatibility';
 return TYPES[id]||id.replace(/^domain-\d+-/,'').replaceAll('-','_');
}
