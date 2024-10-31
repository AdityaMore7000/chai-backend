import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from '../models/user.model.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from 'jsonwebtoken'

const generateAccessAndRefrestTokens = async(userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});
        return {accessToken,refreshToken};
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access tokens")
    }
}

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
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar file is required!')
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;


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

    if (!createduser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createduser, "User Created Successfully")
    );
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body
    if (!(username || email)) {
        throw new ApiError(400, "Username or Email is required!")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User not found!");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefrestTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: ""
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200, {user}, "User Logged Out"
            )
        )

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRequestToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRequestToken){
        throw new ApiError(401,"unathorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRequestToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    
        const user = await User.findById(decodedToken._id);
        
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token!");
        }
        
        if(incomingRequestToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token expired");
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,refreshToken} = await generateAccessAndRefrestTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(200,{accessToken,refreshToken},"Access token refreshed successfully")
        )
    } catch (error) {
        throw new ApiError(500, error?.message || "Invalid refresh token")
    }
})

export { registerUser, loginUser, logoutUser,refreshAccessToken }

