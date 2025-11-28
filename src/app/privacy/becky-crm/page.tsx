import Link from "next/link";

export const metadata = {
  title: "Becky CRM Privacy Policy | Evangelos Sommer",
  description:
    "Privacy policy for the Becky CRM mobile app covering data collection, storage, permissions, and support contact.",
};

export default function BeckyCrmPrivacyPolicy() {
  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <p className="text-sm font-semibold tracking-wide text-zinc-500">
          Becky CRM
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-base text-zinc-700">
          This policy explains how the Becky CRM mobile app handles your data.
          If anything changes, we will update this page and, when required, the
          in-app notice.
        </p>

        <div className="mt-10 space-y-8 text-base leading-relaxed text-zinc-800">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              What we collect
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium">App inputs:</span> contact or CRM
                details you choose to enter (e.g., names, notes, tasks).
              </li>
              <li>
                <span className="font-medium">Device & diagnostics:</span>{" "}
                limited technical data needed for basic operation and build
                distribution (e.g., device model, OS version, install ID).
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              How data is stored
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Your CRM entries are stored on your device. If future cloud
                sync is introduced, it will be clearly disclosed.
              </li>
              <li>
                Build and delivery services (Expo / Google Play) may handle
                diagnostic data required to install and update the app.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              Data sharing & selling
            </h2>
            <p>
              We do not sell your data. We do not share your CRM content with
              third parties. Platform providers (Expo, Google Play) may process
              limited technical data to enable installs, updates, and crash
              handling.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">Permissions</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium">Network access:</span> used to
                check for app updates and deliver the latest version from Expo
                and Google Play.
              </li>
              <li>
                <span className="font-medium">Device storage:</span> used to
                save your CRM entries locally.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              Your choices
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                You can edit or delete CRM entries in the app at any time.
              </li>
              <li>
                Uninstalling the app removes locally stored data from your
                device.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">Contact</h2>
            <p>
              For privacy questions or requests, email{" "}
              <a
                className="font-medium text-indigo-700 hover:text-indigo-800"
                href="mailto:contact@evangelosommer.com"
              >
                contact@evangelosommer.com
              </a>
              .
            </p>
          </section>

          <section className="space-y-3 border-t border-zinc-200 pt-8">
            <p className="text-sm text-zinc-500">
              Effective date: {new Date().toISOString().slice(0, 10)}
            </p>
            <p className="text-sm text-zinc-500">
              Becky CRM is published by Evangelos Sommer.
            </p>
            <div className="text-sm">
              <Link
                className="text-indigo-700 hover:text-indigo-800"
                href="/"
              >
                Back to evangelosommer.com
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
