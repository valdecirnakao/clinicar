import { Pipe, PipeTransform } from '@angular/core';
@Pipe({name:'documento',standalone:true,pure:true})
export class DocumentoPipe implements PipeTransform {
  transform(valor:string|null|undefined):string {
    if(!valor)return '—';const numero=valor.replace(/\D/g,'');
    if(numero.length===11)return numero.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4');
    if(numero.length===14)return numero.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,'$1.$2.$3/$4-$5');
    return valor;
  }
}
