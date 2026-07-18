interface Memory {

    key:string;

    value:string;

}


let memories:Memory[]=[];



export function saveMemory(
key:string,
value:string
){

    memories.push({
        key,
        value
    });

}



export function getMemory(
key:string
){

    return memories.find(
        item=>item.key===key
    );

}