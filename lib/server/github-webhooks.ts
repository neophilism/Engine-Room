import { getDatabasePool } from "./database";

export type GitHubWebhookDelivery = {
  deliveryId: string;
  event: string;
  payload: unknown;
  receivedAt?: Date;
};

export async function recordGitHubWebhookDelivery(
  delivery: GitHubWebhookDelivery
): Promise<"inserted" | "duplicate"> {
  const result = await getDatabasePool().query(
    `insert into github_webhook_deliveries (
      delivery_id,
      event_name,
      payload,
      received_at
    ) values ($1, $2, $3::jsonb, $4)
    on conflict (delivery_id) do nothing
    returning delivery_id`,
    [
      delivery.deliveryId,
      delivery.event,
      JSON.stringify(delivery.payload),
      delivery.receivedAt ?? new Date()
    ]
  );

  return result.rowCount === 1 ? "inserted" : "duplicate";
}
