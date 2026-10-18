# PriceBreakdown

Import through `components/pricing`. The component accepts generated API types;
pass the response data without mapping it to a new DTO.

```tsx
import { PriceBreakdown } from '../../components/pricing';

<PriceBreakdown
  kind="product"
  data={product.priceBreakdown ?? null}
  currency={product.currency ?? ''}
/>

<PriceBreakdown kind="booking" data={booking ?? null} />

<PriceBreakdown
  kind="order"
  data={order ?? null}
  isLoading={isLoading}
  hasError={isError}
  isOffline={!isOnline}
/>
```

Product breakdowns do not contain currency, so pass the currency from the product
response. Booking/order currency comes from the supplied response. Missing
currency or nonfinite amounts display as unavailable; missing optional charge
rows are omitted, while an explicit zero remains visible. A missing total is
never reconstructed from the other rows. Item line totals are server snapshots;
quantity and unit price are never multiplied here.

Product `purchaseCost` is labeled producer purchase cost. The component does not
infer a producer percentage, expand it to an order-wide producer share, or add it
to other costs. Product `transportCost` is distinct from order `deliveryFee`, and
booking `feeAmount` is labeled booking fee. Do not treat a product unit breakdown
as a cart total. The backend confirms checkout amounts.

For multiple breakdowns on one page, provide distinct translated `title` values,
for example a heading containing the order number. Strings are registered in the
component's `pricing` namespace, with selected language → Amharic → English
fallback. Existing shared page translation files are untouched.

`isLoading` and `hasError` hide old amounts; a null/empty response shows an empty
state. `isOffline` labels retained data. The parent owns fetching, retry controls,
network state, and private-response cache policy. This component does not fetch,
cache, or authorize anything.

The component is read-only, uses semantic headings and description lists, and
allows long item names and rows to wrap. Automated accessibility checks exclude
color contrast because jsdom cannot measure it. A real-browser check at 360 px,
zoom, keyboard reading order, and contrast is still required by F-507.
