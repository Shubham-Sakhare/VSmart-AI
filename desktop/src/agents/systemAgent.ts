export async function systemAgent(
  target: string
): Promise<string> {

  try {

const result = await window.vsmart.openSystem(target);


    return result;


  } catch(error){

    return `I could not open ${target}.`;

  }

}