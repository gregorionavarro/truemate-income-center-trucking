# Stable baseline · 2026-10-01

Reference commit: `74b6e0aa62972923fd5eb5d492b21f5b5fcb80a6`

This commit is the stable baseline confirmed visually before adding the monthly report and tightening the Ingresos month filter.

Key stable behaviors at this point:
- Summary does not jump during normal refreshes.
- Movimientos recientes remains stable.
- Ingresos pendientes de confirmar is positioned between recent movements and DP review.
- Invoices pendientes de revisión and Próximos pagos Carrier/MGA/PFA follow the staged workflow.
- Owner access is isolated to Gregorio Navarro through Cloudflare Access.

If a later UI enhancement causes instability, use this commit as the reference point for comparison.