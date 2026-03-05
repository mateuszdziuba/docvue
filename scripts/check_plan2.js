const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);

async function check() {
    const { data: plans, error: listError } = await supabase
      .from('beauty_plans')
      .select('id')
      .limit(1);

    if (listError) {
        console.error("Failed to list plans:", listError);
        return;
    }
    
    if (!plans || plans.length === 0) {
        console.log("No plans exist in the database yet. Create one first.");
        return;
    }

    const id = plans[0].id;
    console.log(`Testing with plan ID: ${id}`);

    const { data: plan, error } = await supabase
      .from('beauty_plans')
      .select(`
        *,
        clients(name),
        salons(name, logo_url),
        products:beauty_plan_products (*)
      `)
      .eq('id', id)
      .single()

    if (error) {
        console.error("RAW SUPABASE ERROR DUMP:");
        console.dir(error, { depth: null });
        console.log("JSON STRINGIFIED:", JSON.stringify(error));
    } else {
        console.log("SUCCESS! Got plan:", plan.id);
    }
}

check();
