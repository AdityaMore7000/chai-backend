import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, username, email, password } = req.body;
    if ([fullname, password, email, username].some((field) => field?.trim() === "")) {
        throw new ApiError(400, 'All fields are needed')
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { username }]
    })

    if (existingUser) {
        throw new ApiError(409, 'User Already exists')
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar file is required!')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath?await uploadOnCloudinary(coverImageLocalPath):null;
    

    if (!avatar) {
        throw new ApiError(400, 'Avatar file is required!')
    }

    const user = await User.create( 
        {
            email,
            username: username.toLowerCase(),
            fullname,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            password
        }
    )

    const createduser = await User.findById(user._id).select("-password -refreshToken")

    if(!createduser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200,createduser,"User Created Successfully")
    );
})

export { registerUser }

