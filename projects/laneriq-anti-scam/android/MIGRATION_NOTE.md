# Android P0 Migration

This directory is the standalone LANERIQ Anti Scam Android product track for P0 Guardian Reliability Foundation.

The first migration imports the isolated Guardian prototype from `test/laneriq-antivirus-apk-20260905` into the new product boundary. The prototype is not Production and does not prove 24/7 device-wide antivirus protection.

Next P0 steps:

- normalize package/application identity for the standalone Anti Scam product
- add Protection Lease issuance/expiry
- add Guardian truth-state machine
- add local event deduplication and bounded event log
- add resource governor metrics
- add CI state-transition tests
- produce a new standalone P0 test artifact
