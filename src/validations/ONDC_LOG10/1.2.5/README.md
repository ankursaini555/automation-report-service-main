### L3 Validation Rules

#### /search

- Provider holidays should not be past dated.
- Feature discovery for all enhanced feature flows with their respective feature codes
- for PREPAID_PAYMENT_FLOW - payment/type should be ON-ORDER
- for COD flow, cod tag = yes in linked order

## to do
- for immediate delivery flow, retail category should be F&B,Grocery and category should be 'Immediate Delivery'
- Order prep time should be according to the logistics category (as per the mapping)
- reverse geocoding for start area code and context city code


#### /on_search

- categories/time/timestamp or items/time/timestamp should be relative to context/timestamp as per the TAT 
- both forward and backward shipments should be provided
- Feature discovery for all enhanced feature flows with their respective feature codes
- for COD flow, special_req tag should be present in bpp/providers tags, along with cod item in items

#### /init

- Billing timestamp is not future dated to `context/timestamp`.

#### /on_init

- Quote breakup shouild be equal to the total quote price

#### /confirm

- `Order.created_at` and `updated_at` must be the same and not future-dated to `context/timestamp`.
- `fulfillments/start/instructions` are required when `ready_to_ship = 'yes'`.
- `cod_settlement_detail' tag should be present for COD flow

#### /on_confirm

- `order/updated_at` cannot be future dated w.r.t `context/timestamp`.
- `order/created_at` cannot be future dated w.r.t `context/timestamp`.
- `order/created_at` cannot be future dated w.r.t `order/updated_at`.
- `order/updated_at` should be updated w.r.t `context/timestamp`.
- Pickup timestamp cannot be provided when the fulfillment is in `${ffState}` state.
- `start/time/range` is required in `/fulfillments` when `ready_to_ship = yes` in `/confirm`.

#### /update

- `order/updated_at` cannot be future dated w.r.t `context/timestamp`.
- `/fulfillments/start` is required when `ready_to_ship = yes`.
- Pickup code is missing in `fulfillments/start/instructions` when `ready_to_ship = yes`.

#### /on_update

- `AWB No (@ondc/org/awb_no)` is required in `/fulfillments` for P2H2P shipments.
- `start/time/range` is required in `/fulfillments` when `ready_to_ship = yes` in `/update`.
- `start/time/timestamp` or `end/time/timestamp` cannot be provided in `/fulfillments` when fulfillment state is `${ffState}`.
- Shipping label (`/start/instructions/images`) is required for P2H2P shipments.
- for weight differential flow, diff tags and quote will be updated

#### /on_status

- Tracking should be enabled (`true`) for hyperlocal (Immediate Delivery).
- If `on_status.state` is 'Complete' and `payment.type` is 'ON-FULFILLMENT`:
  - Payment status should be `'PAID'`.
  - Payment time should be recorded.
- Pickup timestamp (`fulfillments/start/time/timestamp`) cannot change for fulfillment states `${ffState}` ('Out-for-delivery', 'At-destination-hub', 'In-transit').
- pickup timestamp cannot be future dated
- delivery timestamp cannot be future dated
- `cod_collection_detail' tag should be present for COD flow once order is delivered
- for pickup and delivery attempt flows, additional fulfillment states (pickup and delivery scheduled) along with fulfillment tags are required


#### /on_track

- location/time/timestamp should not be future dated w.r.t `context/timestamp` or `location/updated_at`
