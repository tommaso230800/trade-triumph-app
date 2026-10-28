import {it,expect} from 'vitest';
import {resolveProductPrice} from './priceResolver';
it('mantiene il prezzo operativo mentre una proposta resta separata',()=>{expect(resolveProductPrice({productId:'p',listPrice:0.79,customPricesByProduct:new Map([['p',{custom_price:0.55}]]),lastOrderByProduct:new Map()})).toEqual({price:0.55,source:'custom'});});