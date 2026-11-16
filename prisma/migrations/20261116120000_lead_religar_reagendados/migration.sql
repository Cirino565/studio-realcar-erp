-- Conserta leads que desmarcaram/faltaram e ja foram reagendados: o lead
-- continuava preso ao horario cancelado. Liga ao proximo horario ativo da
-- cliente (que ainda nao seja de outro lead) e move para "Agendado".
WITH candidatos AS (
  SELECT DISTINCT ON (l."id")
    l."id" AS lead_id,
    novo."id" AS agendamento_id,
    novo."data" AS data_novo
  FROM "Lead" l
  JOIN "Agendamento" antigo ON antigo."id" = l."agendamentoId"
  JOIN "Agendamento" novo
    ON novo."clienteId" = l."clienteId"
   AND novo."id" <> antigo."id"
   AND novo."data" >= NOW()
   AND novo."status" NOT IN ('Cancelado', 'Faltou', 'Atendido')
   AND NOT EXISTS (SELECT 1 FROM "Lead" x WHERE x."agendamentoId" = novo."id")
  WHERE l."etapa" NOT IN ('Convertido', 'Perdido')
    AND antigo."status" IN ('Cancelado', 'Faltou')
  ORDER BY l."id", novo."data" ASC
),
unicos AS (
  SELECT DISTINCT ON (agendamento_id) lead_id, agendamento_id, data_novo
  FROM candidatos
  ORDER BY agendamento_id, lead_id DESC
),
atualizados AS (
  UPDATE "Lead" l
     SET "agendamentoId" = u.agendamento_id,
         "etapa" = 'Agendado',
         "proximoContatoEm" = NULL,
         "updatedAt" = NOW()
    FROM unicos u
   WHERE l."id" = u.lead_id
  RETURNING l."id", u.data_novo
)
INSERT INTO "LeadInteracao" ("leadId", "tipo", "descricao", "createdAt")
SELECT a."id", 'Reagendamento',
       'Ligado automaticamente ao novo horário de ' || to_char(a.data_novo AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') || ' (tinha desmarcado e reagendou).',
       NOW()
FROM atualizados a;
