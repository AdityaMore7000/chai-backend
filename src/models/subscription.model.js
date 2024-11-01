import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber:{ // the one who subscribes
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    channel:{ // the one to whom users subcribes
        type:Schema.Types.ObjectId,
        ref:"User"
    }
},
    {
        timestamps:true
    }
)

export const Subscription = mongoose.model("Subscription",subscriptionSchema)