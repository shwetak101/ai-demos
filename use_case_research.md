# Use Case Research

**Repository:** shwetak101/ai-demos  
**Branch:** main  
**Prepared on:** 2026-09-03

## Use Case Summary

- **Use Case:** App that displays FD rates from 5 banks
- **Business Problem:** Competitive FD rates must be gathered manually from multiple bank websites, causing delays in market intelligence and pricing decisions.
- **Affected Users:** Internal bank employees
- **Current Process:** Employees manually visit bank websites weekly and spend approximately 6 hours compiling competitor FD rates.

## Cost of Inaction

- **Operational Impact:** Continued manual monitoring effort of approximately 312 hours per year.
- **Financial Impact:** Approximately $14,300 in annual labor savings are not realized.
- **Risk Impact:** Delayed pricing decisions contribute to customers moving funds to competitors.
- **Strategic Impact:** Reduced competitiveness and slower response to market rate changes.

## Expected Benefits

| Benefit | Metric | Baseline | Target | Measurement Method |
|---|---|---|---|---|
| Faster competitive monitoring | Time per monitoring cycle | 6 hours | 30 minutes | Process timing logs |
| Reduced manual effort | Annual hours spent | 312 hours | 26 hours | Activity tracking |
| Reduced deposit attrition | Deposits at risk | $500,000/year | $350,000/year or less | Deposit portfolio reporting |
| Faster pricing response | Pricing decision latency | Delayed manual process | Near real-time visibility | Product management records |

## Quantifiable Value

- **Annual Time Savings:** 286 hours
- **Annual Cost Savings:** $14,300 gross, approximately $11,900 net after maintenance
- **Revenue Impact:** Potential protection of approximately $150,000 in deposits annually
- **Risk Reduction:** Faster response to competitor rate changes and reduced customer fund migration

## ROI Assessment

- **Estimated Benefit:** Approximately $161,900 annually (operational savings plus protected deposits assumption)
- **Estimated Cost:** $25,000 implementation cost
- **ROI:** Approximately 548%
- **Payback Period:** Less than 2 months

## Assumptions

- Competitor-rate visibility reduces deposit attrition by 30%.
- Annual deposits at risk are approximately $500,000.
- Weekly monitoring remains required.
- Employee labor cost is $50 per hour.

## Risks

- Bank websites change frequently.
- Monthly website changes may break automated collection.
- Data quality issues could impact pricing decisions.

## Open Questions

- Should rates be sourced through APIs instead of website scraping where available?
- What governance and validation controls are required before publishing competitor rates internally?

## Business Value Score

Rate the use case from 1-10 based on:
- Strategic Alignment
- Measurability
- Value Potential
- Risk Reduction
- Implementation Effort

**Score:** 9/10

## Recommendation

**Recommendation:** Strong Business Case

**Reasoning:** The solution substantially reduces manual effort, accelerates competitive intelligence gathering, improves pricing responsiveness, and may help protect approximately $150,000 in deposits annually. Although monthly website changes introduce maintenance requirements, the expected business value significantly outweighs implementation and support costs.