import Footer from "@/components/Footer";
export const metadata = { title: "Policies & credits" };

export default function Policies() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6 text-[15px] leading-relaxed">
      <h1 className="font-display text-3xl font-extrabold">Policies</h1>
      <p>Lumio is an independent demo and learning project. It is not affiliated with, endorsed by, or a copy of any existing company&apos;s product. All users, posts, videos and messages are fictional test data.</p>
      <h2 className="text-xl font-bold">Community rules</h2>
      <p className="text-muted">No harassment, hate, nudity, violence, spam, impersonation or illegal content. Moderators may remove content, warn, limit or suspend accounts. Affected users always see the reason and may appeal.</p>
      <h2 className="text-xl font-bold">Privacy</h2>
      <p className="text-muted">You can make your account private, export your data, and delete your account (30-day grace period). Media is URL-based; no EXIF/location data is stored.</p>
      <h2 id="credits" className="text-xl font-bold">Credits</h2>
      <Footer />
    </div>
  );
}
