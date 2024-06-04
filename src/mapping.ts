import { log } from "@graphprotocol/graph-ts";
import { EventList } from "./pb/sf/substreams/cosmos/v1/EventList";
import { Transfer } from "../generated/schema";
import { Protobuf } from 'as-proto/assembly';
import { BigInt } from '@graphprotocol/graph-ts'


export function handleEvents(bytes: Uint8Array): void {
    const eventList: EventList = Protobuf.decode<EventList>(bytes, EventList.decode);
    const events = eventList.events;

    log.info("Protobuf decoded, length: {}", [events.length.toString()]);


    for (let i = 0; i < events.length; i++) {
        const event = events[i].event;
        if (event == null || event.type != "transfer") { // should be filtered by substreams
            continue;
        }

        let amount = "";
        let recipient = "";
        let sender = "";
    

        for (let i = 0; i < event.attributes.length; ++i) {
            const attr = event.attributes[i];
            if (attr.key == 'amount') {
                    amount = attr.value.toString();
            } else if (attr.key == 'recipient') {
                recipient = attr.value;
            } else if (attr.key == 'sender') {
                sender = attr.value;
            }
        }

    let ID = sender + recipient;

    let entity = Transfer.load(ID);
    if (entity == null) {
        log.info("Entity not found, creating one...", []);
        entity = new Transfer(ID);
        entity.totalAmount = '0';
        entity.sender = sender.toString();
        entity.recipient = recipient.toString();
    }

    if (amount.includes("inj")) {
        amount = amount.split("inj")[0];
    }

    if (amount.includes("peggy")) {
        amount = amount.split("peggy")[0];
    }

    if (amount.includes("share")) {
        amount = amount.split("share")[0];
    }

    const exchangeAmount = BigInt.fromString(amount);
    const entityAmount = BigInt.fromString(entity.totalAmount);
    const sumResult = entityAmount.plus(exchangeAmount);
    entity.totalAmount = sumResult.toString();
    entity.save();
    log.debug("Entity saved: {}", [entity.totalAmount]);
    }
}