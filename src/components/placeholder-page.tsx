import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description?: string;
  plannedFeatures?: string[];
}

/**
 * Shared placeholder used by every feature page until the real UI lands.
 * Lets us wire up navigation and role gating in the skeleton PR without
 * building out the full forms/tables.
 */
export function PlaceholderPage({
  title,
  description,
  plannedFeatures,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-neutral-600">
          <p>此功能尚在開發中。</p>
          {plannedFeatures && plannedFeatures.length > 0 && (
            <div>
              <p className="mb-2 font-medium text-neutral-900">預計功能：</p>
              <ul className="list-disc space-y-1 pl-5">
                {plannedFeatures.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
