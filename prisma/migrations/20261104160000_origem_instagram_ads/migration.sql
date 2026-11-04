-- Nova origem "Instagram Ads" (anuncio pago do Instagram, conta como clique pago).
INSERT INTO "OrigemCliente" ("nome", "status", "ordem", "createdAt", "updatedAt")
SELECT 'Instagram Ads', 'Ativa', COALESCE((SELECT MAX("ordem") FROM "OrigemCliente"), 0) + 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "OrigemCliente" WHERE "nome" = 'Instagram Ads');
