import blueLogo from '../../assets/foose-logo-blue.png'
import { withBasePath } from '../../utils/navigation'

export function Footer() {
  const brand = blueLogo;

  return (
    <footer className="footer">
      <div className="footer-brand flex flex-col gap-2.5">
        <img className="footer-logo" src={brand} alt="" />
        <p>Ghana&apos;s second-hand fashion hub. Curated, authenticated, delivered.</p>
      </div>
      {[
        ['Marketplace', ['Browse All', 'Fresh Drops', 'DigiShops', 'Bale Wholesale']],
        ['Community', ['Events', 'Sellers Hub', 'Style Guide', 'Forum']],
        ['Support', ['Help Center', 'Verification', 'Shipping', 'Returns']],
      ].map(([title, links]) => (
        <nav key={title as string}>
          <h4>{title}</h4>
          {(links as string[]).map((link) => (
            <a href={withBasePath('/browse')} key={link}>
              {link}
            </a>
          ))}
        </nav>
      ))}
    </footer>
  )
}
