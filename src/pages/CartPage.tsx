import { AppShell, ButtonLink, EmptyState, Icon, OrderSummary } from '../components'
import { useCart } from '../hooks/useCart'
import { formatMoney } from '../utils/format'

export function CartPage() {
  const cart = useCart()

  return (
    <AppShell active="browse" searchPlaceholder="Search curated finds...">
      <section className="page-hero small">
        <h1>Your cart</h1>
        <p>
          {cart.items.length} item{cart.items.length === 1 ? '' : 's'} ready for checkout.
        </p>
      </section>
      {!cart.items.length && (
        <EmptyState
          action={<ButtonLink to="/browse">Browse marketplace</ButtonLink>}
          body="Browse the marketplace and add a listing to your cart."
          title="Your cart is empty"
        />
      )}
      {!!cart.items.length && (
        <div className="cart-layout">
          <section className="cart-items">
            {cart.items.map((item) => (
              <article className="cart-item" key={item.listingId}>
                {item.image ? <img alt={item.title} src={item.image} /> : <span className="image-placeholder">No image</span>}
                <div>
                  <h2>{item.title}</h2>
                  <p>Shop: {item.shopName}</p>
                  {item.type === 'wholesale' ? (
                    <div className="qty">
                      <button onClick={() => cart.updateQuantity(item.listingId, item.quantity - 1)} type="button">
                        <Icon name="minus" />
                      </button>
                      <strong>{item.quantity}</strong>
                      <button onClick={() => cart.updateQuantity(item.listingId, item.quantity + 1)} type="button">
                        <Icon name="plus" />
                      </button>
                    </div>
                  ) : (
                    <p className="muted-copy">Single retail item</p>
                  )}
                </div>
                <strong>{formatMoney(item.price * item.quantity, item.currency)}</strong>
                <button aria-label={`Remove ${item.title}`} className="icon-button" onClick={() => cart.removeItem(item.listingId)} type="button">
                  <Icon name="trash" />
                </button>
              </article>
            ))}
          </section>
          <OrderSummary action="Proceed to checkout" href="/checkout" items={cart.items} />
        </div>
      )}
    </AppShell>
  )
}
