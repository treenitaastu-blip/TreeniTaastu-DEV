-- Create motivational quotes table for locked days
CREATE TABLE IF NOT EXISTS public.motivational_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quote TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert Estonian motivational quotes
INSERT INTO public.motivational_quotes (quote, author) VALUES
('"Jõud tuleb mitte füüsilise võime, vaid võitmatu tahtega."', 'Mahatma Gandhi'),
('"Täna on hea päev, et alustada uut."', 'Estonian Proverb'),
('"Iga samm viib sind lähemale eesmärgile."', 'Unknown'),
('"Jõud on võime taluda valu ja kasvada sellest."', 'Unknown'),
('"Parim aeg istuda puu alla oli 20 aastat tagasi. Teine parim aeg on täna."', 'Chinese Proverb'),
('"Iga päev on uus võimalus olla parem versioon endast."', 'Unknown'),
('"Jõud tuleb mitte füüsilise võime, vaid võitmatu tahtega."', 'Mahatma Gandhi'),
('"Täna on hea päev, et alustada uut."', 'Estonian Proverb'),
('"Iga samm viib sind lähemale eesmärgile."', 'Unknown'),
('"Jõud on võime taluda valu ja kasvada sellest."', 'Unknown'),
('"Parim aeg istuda puu alla oli 20 aastat tagasi. Teine parim aeg on täna."', 'Chinese Proverb'),
('"Iga päev on uus võimalus olla parem versioon endast."', 'Unknown'),
('"Jõud tuleb mitte füüsilise võime, vaid võitmatu tahtega."', 'Mahatma Gandhi'),
('"Täna on hea päev, et alustada uut."', 'Estonian Proverb'),
('"Iga samm viib sind lähemale eesmärgile."', 'Unknown'),
('"Jõud on võime taluda valu ja kasvada sellest."', 'Unknown'),
('"Parim aeg istuda puu alla oli 20 aastat tagasi. Teine parim aeg on täna."', 'Chinese Proverb'),
('"Iga päev on uus võimalus olla parem versioon endast."', 'Unknown'),
('"Jõud tuleb mitte füüsilise võime, vaid võitmatu tahtega."', 'Mahatma Gandhi'),
('"Täna on hea päev, et alustada uut."', 'Estonian Proverb');

-- Create function to get random quote
CREATE OR REPLACE FUNCTION public.get_random_motivational_quote()
RETURNS TABLE(quote TEXT, author TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT mq.quote, mq.author
  FROM public.motivational_quotes mq
  ORDER BY RANDOM()
  LIMIT 1;
END;
$function$;

-- Grant permissions
GRANT SELECT ON public.motivational_quotes TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_random_motivational_quote() TO authenticated;
