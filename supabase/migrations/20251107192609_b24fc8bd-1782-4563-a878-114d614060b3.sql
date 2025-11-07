-- Enable Realtime for the kpis table
ALTER TABLE kpis REPLICA IDENTITY FULL;

-- Add kpis table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE kpis;