import {
  remember,
  recall
} from "../core/memoryManager";


export async function memoryAgent(
  action: "save" | "get" | "show",
  data?: Record<string, any>
): Promise<string> {


  switch(action){


    case "save":

      return await remember(
        data?.key,
        data?.value
      );


    case "get":

      const result = await recall(
        data?.key
      );


      if(result){

        return `Your ${data?.key} is ${result}.`;

      }


      return `I don't remember your ${data?.key}.`;


    case "show":

      return "Memory list feature coming soon.";


    default:

      return "Unknown memory command.";

  }

}